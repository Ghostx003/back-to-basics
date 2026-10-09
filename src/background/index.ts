import { ExtensionMessage, ExtensionResponse } from '../shared/messages';
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

/**
 * Tab Navigation and Distraction Monitoring
 */
if (typeof chrome !== 'undefined' && chrome.tabs) {
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, _tab) => {
    if (tabId !== tabsManager.getManagedTabId() || !changeInfo.url) {
      return;
    }

    const state = sessionManager.getState();
    if (state.status !== 'RunningStudy' && state.status !== 'RunningBreak') {
      return;
    }

    const newUrl = changeInfo.url;
    // Don't monitor internal browser schemes or about:blank
    if (newUrl.startsWith('chrome://') || newUrl.startsWith('chrome-extension://') || newUrl === 'about:blank') {
      return;
    }

    // Check if new URL is already approved or same origin/domain
    const isApproved = state.approvedUrls.some((u) => {
      try {
        const u1 = new URL(u);
        const u2 = new URL(newUrl);
        return u1.origin === u2.origin;
      } catch {
        return false;
      }
    });

    if (isApproved) {
      await sessionManager.approveNavigation(newUrl);
      broadcastStateUpdate();
    } else {
      // Unexpected navigation! Set pending and notify content script
      await sessionManager.setPendingNavigation(newUrl);
      broadcastStateUpdate();
      await tabsManager.sendMessageToManagedTab({
        type: 'CHECK_NAVIGATION_PERMISSION',
        payload: { url: newUrl },
      });
    }
  });

  // Handle managed tab closure gracefully
  chrome.tabs.onRemoved.addListener(async (tabId) => {
    if (tabId === tabsManager.getManagedTabId()) {
      tabsManager.setManagedTabId(null);
      await sessionManager.setManagedTab(null);
      broadcastStateUpdate();
    }
  });
}

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

            case 'REPORT_MEDIA_STATE': {
              await sessionManager.setMediaPlayingState(message.payload.isPlaying);
              sendResponse({ success: true });
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
