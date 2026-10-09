import { isBlockedUrl } from '../shared/blocklist';
import { ExtensionMessage, ExtensionResponse } from '../shared/messages';
import { getDaysToGateCSE } from '../shared/types';
import { ExtensionStorage } from '../storage/storage';
import { AlarmsManager, DEADLINE_ALARM_NAME } from './alarms';
import { SessionManager } from './session-manager';
import { TabsManager } from './tabs-manager';

const sessionManager = new SessionManager();
const tabsManager = new TabsManager();

/**
 * Broadcasts state changes to all extension views (popup, dashboard) and active tabs.
 */
function broadcastStateUpdate() {
  const state = sessionManager.getState();
  const message: ExtensionMessage = {
    type: 'SESSION_STATE_UPDATED',
    payload: state,
  };

  if (typeof chrome !== 'undefined' && chrome.runtime) {
    try {
      chrome.runtime.sendMessage(message).catch(() => {
        // Ignored if popup or dashboard is currently closed
      });
    } catch {}

    const managedTabId = tabsManager.getManagedTabId();
    if (managedTabId) {
      tabsManager.sendMessageToManagedTab(message).catch(() => {});
    }
  }
}

// Reconnect tabsManager with stored managedTabId
sessionManager.subscribe((state) => {
  if (state.managedTabId !== tabsManager.getManagedTabId()) {
    tabsManager.setManagedTabId(state.managedTabId);
  }
});

/**
 * Handles deadline expiration and executes relevant tab / UI actions.
 */
async function processDeadlineTransition() {
  const currentState = sessionManager.getState();
  if (currentState.status !== 'RunningStudy' && currentState.status !== 'RunningBreak') {
    return;
  }

  const transitionId = `trans_${currentState.id}_${currentState.currentSubjectIndex}_${currentState.currentPomodoroSession}_${Date.now()}`;

  // If entering break in Pomodoro, first ask content script for media state and pause it
  if (currentState.mode === 'pomodoro' && currentState.status === 'RunningStudy') {
    try {
      await tabsManager.sendMessageToManagedTab({ type: 'REQUEST_PAUSE_MEDIA' });
    } catch {}
  }

  const result = await sessionManager.handleDeadlineExpired(transitionId);
  if (!result.transitioned) {
    return;
  }

  // Record completed study interval log if transitioning from RunningStudy
  if (currentState.status === 'RunningStudy') {
    const subjectName = sessionManager.getCurrentSubjectName() || 'Study Interval';
    const durationMinutes = Math.max(1, Math.round(currentState.totalIntervalMs / 60000));
    ExtensionStorage.recordSessionLog({
      id: `sess_${Date.now()}`,
      mode: currentState.mode || 'scheduled',
      subjectName,
      startedAt: Date.now() - currentState.totalIntervalMs,
      endedAt: Date.now(),
      durationMinutes,
      status: 'Completed',
    }).catch(() => {});
  }

  const nextState = result.state;

  if (result.action === 'NAVIGATE' && result.nextUrl) {
    await tabsManager.openOrUpdateStudyTab(result.nextUrl);
    if (nextState.deadline) {
      await AlarmsManager.scheduleDeadlineAlarm(nextState.deadline);
    }
  } else if (result.action === 'SHOW_BREAK') {
    if (nextState.deadline) {
      await AlarmsManager.scheduleDeadlineAlarm(nextState.deadline);
    }
    // Content script will receive updated state with RunningBreak and show break overlay
  } else if (result.action === 'END_BREAK') {
    if (nextState.deadline) {
      await AlarmsManager.scheduleDeadlineAlarm(nextState.deadline);
    }
    // Resume media if it was playing before
    if (nextState.wasMediaPlayingBeforeBreak) {
      try {
        await tabsManager.sendMessageToManagedTab({ type: 'REQUEST_RESUME_MEDIA' });
      } catch {}
    }
  } else if (result.action === 'COMPLETE') {
    await AlarmsManager.clearDeadlineAlarm();
  }

  broadcastStateUpdate();
}

/**
 * Alarms Listener
 */
if (typeof chrome !== 'undefined' && chrome.alarms) {
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === DEADLINE_ALARM_NAME) {
      await processDeadlineTransition();
    }
  });
}

function normalizeHost(urlStr: string): string {
  try {
    return new URL(urlStr).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function isUrlApprovedOrStudy(
  candidateUrl: string | undefined | null,
  currentStudyUrl: string | undefined | null,
  approvedUrls: string[] = []
): boolean {
  if (!candidateUrl) return false;

  if (
    candidateUrl.startsWith('chrome-extension://') ||
    candidateUrl.includes('interrogate.html') ||
    candidateUrl.includes('dashboard.html') ||
    candidateUrl.includes('popup.html')
  ) {
    return true;
  }

  if (currentStudyUrl && candidateUrl === currentStudyUrl) return true;

  const candidateHost = normalizeHost(candidateUrl);
  if (!candidateHost) return false;

  if (currentStudyUrl) {
    const studyHost = normalizeHost(currentStudyUrl);
    if (
      studyHost &&
      (candidateHost === studyHost ||
        candidateHost.endsWith('.' + studyHost) ||
        studyHost.endsWith('.' + candidateHost))
    ) {
      return true;
    }
  }

  for (const approved of approvedUrls) {
    if (candidateUrl === approved) return true;
    const approvedHost = normalizeHost(approved);
    if (
      approvedHost &&
      (candidateHost === approvedHost ||
        candidateHost.endsWith('.' + approvedHost) ||
        approvedHost.endsWith('.' + candidateHost))
    ) {
      return true;
    }
  }

  return false;
}

async function handleBlacklistViolation() {
  const { violationCount: strikes } = await sessionManager.recordViolation();
  const currentSubject = sessionManager.getCurrentSubjectName() || 'your studies';

  if (strikes < 3) {
    await tabsManager.sendMessageToManagedTab({
      type: 'SHOW_STRIKE_WARNING',
      payload: {
        strike: strikes,
        message: `Warning ${strikes} of 3: Stick to your subject (${currentSubject})! Distracting & blacklisted sites are strictly prohibited.`,
        isFinalCountdown: false,
      },
    });
  } else {
    await tabsManager.sendMessageToManagedTab({
      type: 'SHOW_STRIKE_WARNING',
      payload: {
        strike: 3,
        message:
          '3 violations reached! Maximum strikes exceeded. Session terminated.',
        isFinalCountdown: true,
      },
    });

    setTimeout(async () => {
      const currentState = sessionManager.getState();
      const durationMinutes = Math.max(
        1,
        Math.round((currentState.totalIntervalMs - (currentState.remainingMs || 0)) / 60000)
      );

      await ExtensionStorage.recordSessionLog({
        id: `term_${Date.now()}`,
        mode: currentState.mode || 'scheduled',
        subjectName: currentSubject,
        startedAt: Date.now() - durationMinutes * 60000,
        endedAt: Date.now(),
        durationMinutes,
        status: 'Terminated',
      });

      await AlarmsManager.clearDeadlineAlarm();
      tabsManager.closeManagedTab();
      await sessionManager.quitSession();
      broadcastStateUpdate();
    }, 5200);
  }
}

/**
 * Tab Navigation, Distraction Monitoring & 3-Strike Enforcement
 */
if (typeof chrome !== 'undefined' && chrome.tabs) {
  // 1. Interrogate new tabs created during an active study session
  chrome.tabs.onCreated.addListener(async (tab) => {
    // If extension is actively opening or switching the designated study tab, ignore completely!
    if (tabsManager.isOpeningDesignatedTab()) {
      if (tab.id) tabsManager.markDesignatedTab(tab.id);
      return;
    }

    if (tab.id && tabsManager.isDesignatedTab(tab.id)) {
      return;
    }

    const state = sessionManager.getState();
    if (state.status !== 'RunningStudy') {
      return;
    }

    const candidateUrl = tab.pendingUrl || tab.url;
    if (
      candidateUrl &&
      isUrlApprovedOrStudy(candidateUrl, state.currentStudyUrl, state.approvedUrls)
    ) {
      if (tab.id) tabsManager.markDesignatedTab(tab.id);
      return;
    }

    // Genuine non-study new tab created during active study session!
    // Pause study timer immediately & freeze remaining time
    await sessionManager.pauseForInterrogation();
    await AlarmsManager.clearDeadlineAlarm();
    broadcastStateUpdate();

    // If candidate URL is known and blacklisted, kill tab immediately!
    if (candidateUrl) {
      const analytics = await ExtensionStorage.getAnalytics();
      if (isBlockedUrl(candidateUrl, analytics.customBlacklist)) {
        if (tab.id) await chrome.tabs.remove(tab.id).catch(() => {});
        await handleBlacklistViolation();
        return;
      }
    }

    // If new tab is chrome://newtab, brave://newtab, about:blank, or unassigned:
    // Update it directly to the Interrogation Chamber page!
    if (
      !candidateUrl ||
      candidateUrl.startsWith('chrome://') ||
      candidateUrl.startsWith('brave://') ||
      candidateUrl === 'about:blank'
    ) {
      if (tab.id) {
        try {
          await chrome.tabs.update(tab.id, {
            url: chrome.runtime.getURL('interrogate.html'),
          });
        } catch {}
      }
      return;
    }

    // For external websites opened in new tab, inject prompt once page is loaded
    if (tab.id) {
      const newTabId = tab.id;
      const subjectName = sessionManager.getCurrentSubjectName();
      const remainingMinutes = Math.max(
        1,
        Math.ceil((sessionManager.getState().remainingMs || 0) / 60000)
      );
      const daysToGate = getDaysToGateCSE();

      const tabListener = (updatedId: number, change: chrome.tabs.TabChangeInfo) => {
        if (updatedId === newTabId && change.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(tabListener);
          chrome.tabs
            .sendMessage(newTabId, {
              type: 'SHOW_INTERROGATION_PROMPT',
              payload: { subjectName, remainingMinutes, daysToGate },
            })
            .catch(() => {});
        }
      };
      chrome.tabs.onUpdated.addListener(tabListener);
    }
  });

  // 2. Navigation changes on tabs
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, _tab) => {
    if (!changeInfo.url) {
      return;
    }

    const newUrl = changeInfo.url;
    // Don't monitor internal browser schemes or about:blank
    if (
      newUrl.startsWith('chrome://') ||
      newUrl.startsWith('brave://') ||
      newUrl.startsWith('edge://') ||
      newUrl === 'about:blank'
    ) {
      return;
    }

    // Don't monitor extension pages
    if (
      newUrl.startsWith('chrome-extension://') ||
      newUrl.includes('interrogate.html') ||
      newUrl.includes('dashboard.html')
    ) {
      return;
    }

    const state = sessionManager.getState();
    if (state.status !== 'RunningStudy' && state.status !== 'RunningBreak') {
      return;
    }

    // If extension is opening designated tab, allow without prompt
    if (tabsManager.isOpeningDesignatedTab() && tabsManager.isDesignatedTab(tabId)) {
      return;
    }

    // Retrieve analytics to include user's custom blacklist
    const analytics = await ExtensionStorage.getAnalytics();
    const isViolating = isBlockedUrl(newUrl, analytics.customBlacklist);

    // If blacklisted URL is visited during study:
    if (isViolating) {
      // Immediately close violating tab
      await chrome.tabs.remove(tabId).catch(() => {});
      await handleBlacklistViolation();
      return;
    }

    // Check if URL is approved or is current study URL
    const isApproved = isUrlApprovedOrStudy(newUrl, state.currentStudyUrl, state.approvedUrls);

    if (isApproved) {
      if (tabId === tabsManager.getManagedTabId()) {
        await sessionManager.approveNavigation(newUrl);
        broadcastStateUpdate();
      }
      return;
    }

    // URL is NOT approved and NOT the study URL!
    if (tabId === tabsManager.getManagedTabId()) {
      // Managed tab navigated away! Grill user
      await sessionManager.setPendingNavigation(newUrl);
      broadcastStateUpdate();
      await tabsManager.sendMessageToManagedTab({
        type: 'CHECK_NAVIGATION_PERMISSION',
        payload: { url: newUrl },
      });
      return;
    }

    // Another tab navigating to an unapproved external site during study:
    await sessionManager.pauseForInterrogation();
    await AlarmsManager.clearDeadlineAlarm();
    broadcastStateUpdate();

    const subjectName = sessionManager.getCurrentSubjectName();
    const remainingMinutes = Math.max(
      1,
      Math.ceil((sessionManager.getState().remainingMs || 0) / 60000)
    );
    const daysToGate = getDaysToGateCSE();

    chrome.tabs
      .sendMessage(tabId, {
        type: 'SHOW_INTERROGATION_PROMPT',
        payload: { subjectName, remainingMinutes, daysToGate },
      })
      .catch(() => {});
  });

  // 3. Handle managed tab closure
  chrome.tabs.onRemoved.addListener(async (tabId) => {
    if (tabId === tabsManager.getManagedTabId()) {
      const state = sessionManager.getState();
      if (state.status === 'RunningStudy' || state.status === 'RunningBreak') {
        // Automatically reopen the designated study tab!
        if (state.currentStudyUrl) {
          const newTabId = await tabsManager.openOrUpdateStudyTab(state.currentStudyUrl);
          await sessionManager.setManagedTab(newTabId);
          broadcastStateUpdate();

          // Display the "YOU ARE NOT DONE YET!" modal
          setTimeout(async () => {
            await tabsManager.sendMessageToManagedTab({
              type: 'SHOW_REOPENED_PROMPT',
            });
          }, 800);
        }
      } else {
        tabsManager.setManagedTabId(null);
        await sessionManager.setManagedTab(null);
        broadcastStateUpdate();
      }
    }
  });
}

/**
 * Accurate Active Website Time Tracking (No Double Counting)
 */
setInterval(async () => {
  const state = sessionManager.getState();
  if (state.status === 'RunningStudy' && !state.isInterrogating) {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      try {
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, async (tabs) => {
          if (tabs && tabs.length > 0 && tabs[0].url) {
            const url = tabs[0].url;
            if (
              !url.startsWith('chrome://') &&
              !url.startsWith('chrome-extension://') &&
              !url.startsWith('brave://') &&
              !url.startsWith('edge://') &&
              url !== 'about:blank'
            ) {
              try {
                const domain = new URL(url).hostname;
                await ExtensionStorage.trackWebsiteTime(domain, 1);
              } catch {}
            }
          }
        });
      } catch {}
    }
  }
}, 1000);

/**
 * Startup and Recovery: Check if alarms need reconciliation
 */
async function reconcileOnStartup() {
  const state = await sessionManager.loadInitialState();
  tabsManager.setManagedTabId(state.managedTabId);

  if (state.status === 'RunningStudy' || state.status === 'RunningBreak') {
    const now = Date.now();
    if (state.deadline && state.deadline <= now) {
      // Overdue while browser was closed! Safely process transition
      await processDeadlineTransition();
    } else if (state.deadline) {
      // Re-register alarm for remaining duration
      await AlarmsManager.scheduleDeadlineAlarm(state.deadline);
    }
  }
}

if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onStartup.addListener(reconcileOnStartup);
  chrome.runtime.onInstalled.addListener(reconcileOnStartup);
}

// Initial reconciliation when worker boots
reconcileOnStartup();

/**
 * Message Handler
 */
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onMessage.addListener(
    (
      message: ExtensionMessage,
      _sender,
      sendResponse: (response: ExtensionResponse) => void
    ) => {
      (async () => {
        try {
          switch (message.type) {
            case 'GET_SESSION_STATE': {
              sendResponse({
                success: true,
                data: sessionManager.getState(),
              });
              break;
            }

            case 'START_SCHEDULED_STUDY': {
              const { subjects } = message.payload;
              await ExtensionStorage.saveScheduledConfig(subjects);
              tabsManager.setOpeningDesignated(true, 3500);
              const tabId = await tabsManager.openOrUpdateStudyTab(subjects[0].url);
              const state = await sessionManager.startScheduledStudy(subjects, tabId);
              if (state.deadline) {
                await AlarmsManager.scheduleDeadlineAlarm(state.deadline);
              }
              broadcastStateUpdate();
              sendResponse({ success: true, data: state });
              break;
            }

            case 'START_POMODORO': {
              const { subjects } = message.payload;
              await ExtensionStorage.savePomodoroConfig(subjects);
              tabsManager.setOpeningDesignated(true, 3500);
              const tabId = await tabsManager.openOrUpdateStudyTab(subjects[0].url);
              const state = await sessionManager.startPomodoro(subjects, tabId);
              if (state.deadline) {
                await AlarmsManager.scheduleDeadlineAlarm(state.deadline);
              }
              broadcastStateUpdate();
              sendResponse({ success: true, data: state });
              break;
            }

            case 'PAUSE_SESSION': {
              await AlarmsManager.clearDeadlineAlarm();
              const state = await sessionManager.pause();
              broadcastStateUpdate();
              sendResponse({ success: true, data: state });
              break;
            }

            case 'RESUME_SESSION': {
              const state = await sessionManager.resume();
              if (state.deadline) {
                await AlarmsManager.scheduleDeadlineAlarm(state.deadline);
              }
              broadcastStateUpdate();
              sendResponse({ success: true, data: state });
              break;
            }

            case 'RESET_SESSION': {
              const state = await sessionManager.reset();
              if (state.currentStudyUrl) {
                tabsManager.setOpeningDesignated(true, 3500);
                const tabId = await tabsManager.openOrUpdateStudyTab(state.currentStudyUrl);
                await sessionManager.setManagedTab(tabId);
              }
              if (state.deadline) {
                await AlarmsManager.scheduleDeadlineAlarm(state.deadline);
              }
              broadcastStateUpdate();
              sendResponse({ success: true, data: state });
              break;
            }

            case 'SKIP_BREAK': {
              const result = await sessionManager.skipBreak();
              if (result.deadline) {
                await AlarmsManager.scheduleDeadlineAlarm(result.deadline);
              }
              if (result.wasMediaPlayingBeforeBreak) {
                await tabsManager.sendMessageToManagedTab({
                  type: 'REQUEST_RESUME_MEDIA',
                });
              }
              broadcastStateUpdate();
              sendResponse({ success: true, data: result });
              break;
            }

            case 'INTERROGATION_A_CHOSEN': {
              if (message.payload?.url) {
                await sessionManager.approveNavigation(message.payload.url);
              }
              const state = await sessionManager.resumeFromInterrogation();
              if (state.deadline) {
                await AlarmsManager.scheduleDeadlineAlarm(state.deadline);
              }
              broadcastStateUpdate();
              sendResponse({ success: true, data: state });
              break;
            }

            case 'INTERROGATION_B_RETURN': {
              const state = await sessionManager.resumeFromInterrogation();
              if (state.deadline) {
                await AlarmsManager.scheduleDeadlineAlarm(state.deadline);
              }
              const managedId = tabsManager.getManagedTabId();
              if (managedId && typeof chrome !== 'undefined' && chrome.tabs) {
                chrome.tabs.update(managedId, { active: true }).catch(() => {});
              }
              if (_sender && _sender.tab && _sender.tab.id && _sender.tab.id !== managedId) {
                chrome.tabs.remove(_sender.tab.id).catch(() => {});
              }
              broadcastStateUpdate();
              sendResponse({ success: true, data: state });
              break;
            }

            case 'APPROVE_NAVIGATION': {
              const state = await sessionManager.approveNavigation(message.payload.url);
              broadcastStateUpdate();
              sendResponse({ success: true, data: state });
              break;
            }

            case 'REJECT_NAVIGATION': {
              const state = sessionManager.getState();
              if (state.currentStudyUrl) {
                await tabsManager.openOrUpdateStudyTab(state.currentStudyUrl);
              }
              await sessionManager.setPendingNavigation(null);
              broadcastStateUpdate();
              sendResponse({ success: true, data: state });
              break;
            }

            case 'QUIT_SESSION': {
              await AlarmsManager.clearDeadlineAlarm();
              const state = await sessionManager.quitSession();
              broadcastStateUpdate();
              sendResponse({ success: true, data: state });
              break;
            }

            case 'REPORT_MEDIA_STATE': {
              await sessionManager.setMediaPlayingState(message.payload.isPlaying);
              sendResponse({ success: true });
              break;
            }

            case 'GET_ANALYTICS': {
              const analytics = await ExtensionStorage.getAnalytics();
              sendResponse({ success: true, data: analytics });
              break;
            }

            case 'ADD_CUSTOM_BLACKLIST': {
              const updated = await ExtensionStorage.addCustomBlacklistDomain(message.payload.domain);
              sendResponse({ success: true, data: updated });
              break;
            }

            case 'REMOVE_CUSTOM_BLACKLIST': {
              const updated = await ExtensionStorage.removeCustomBlacklistDomain(message.payload.domain);
              sendResponse({ success: true, data: updated });
              break;
            }

            case 'CLEAR_HISTORY': {
              await ExtensionStorage.clearAnalytics();
              const cleared = await ExtensionStorage.getAnalytics();
              sendResponse({ success: true, data: cleared });
              break;
            }

            case 'GET_SETTINGS': {
              const settings = await ExtensionStorage.getSettings();
              sendResponse({ success: true, data: settings });
              break;
            }

            case 'UPDATE_SETTINGS': {
              const current = await ExtensionStorage.getSettings();
              const updated = { ...current, ...message.payload };
              await ExtensionStorage.saveSettings(updated);
              sendResponse({ success: true, data: updated });
              break;
            }

            default:
              sendResponse({ success: false, error: 'Unknown message type' });
          }
        } catch (err: any) {
          sendResponse({ success: false, error: err.message || 'Operation failed' });
        }
      })();

      return true; // Keep message port open for async response
    }
  );
}
