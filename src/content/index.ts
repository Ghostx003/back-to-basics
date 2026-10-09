import { ExtensionMessage, ExtensionResponse } from '../shared/messages';
import { ExtensionSettings, isExactSameStudyUrl, SessionState } from '../shared/types';
import { BreakOverlay } from './break-overlay';
import { NavigationGuard } from './navigation-guard';
import { TickerSound } from './ticker';
import { VideoController } from './video-controller';

const videoController = new VideoController();
const tickerSound = new TickerSound();
const breakOverlay = new BreakOverlay();
const navigationGuard = new NavigationGuard();

let currentSessionState: SessionState | null = null;
let currentSettings: ExtensionSettings = { soundEnabled: true, pauseOnTabSwitch: false };
let checkIntervalId: number | null = null;

/**
 * Syncs the visual and audio state with the latest session state.
 */
function syncWithSessionState(state: SessionState) {
  currentSessionState = state;

  if (state.status === 'RunningBreak') {
    tickerSound.stop();
    if (state.deadline) {
      breakOverlay.show(state.deadline, state.totalIntervalMs, () => {
        chrome.runtime.sendMessage<ExtensionMessage>({ type: 'SKIP_BREAK' });
      });
    }
  } else {
    breakOverlay.hide();
  }

  // Handle ticking check
  checkTickingStatus();
}

/**
 * Evaluates whether the 30-second ticking sound should be active.
 */
function checkTickingStatus() {
  if (!currentSessionState || !currentSettings.soundEnabled) {
    tickerSound.stop();
    return;
  }

  if (currentSessionState.status === 'RunningStudy' && currentSessionState.deadline) {
    const remaining = currentSessionState.deadline - Date.now();
    if (remaining <= 30000 && remaining > 0) {
      tickerSound.start();
    } else {
      tickerSound.stop();
    }
  } else {
    tickerSound.stop();
  }
}

// Start a lightweight 1-second interval to check ticker transition into the final 30 seconds
if (checkIntervalId === null) {
  checkIntervalId = window.setInterval(checkTickingStatus, 1000);
}

// Aggressive link interceptor: grill user if ANY link clicked does not equal the designated study URL
if (typeof document !== 'undefined') {
  document.addEventListener('click', (event) => {
    if (!currentSessionState || currentSessionState.status !== 'RunningStudy') {
      return;
    }

    const anchor = (event.target as HTMLElement)?.closest('a');
    if (!anchor || !anchor.href) {
      return;
    }

    const href = anchor.href;
    if (
      href.startsWith('javascript:') ||
      href.startsWith('#') ||
      href === window.location.href ||
      href.startsWith('chrome-extension://')
    ) {
      return;
    }

    try {
      // 1. If clicking an anchor or section on the SAME exact designated page, allow without questioning
      if (
        currentSessionState.currentStudyUrl &&
        isExactSameStudyUrl(href, currentSessionState.currentStudyUrl)
      ) {
        return;
      }

      // 2. If clicking an already approved link, allow without questioning
      const isApproved = currentSessionState.approvedUrls.some((u) =>
        isExactSameStudyUrl(href, u)
      );
      if (isApproved) {
        return;
      }

      // 3. Current link is NOT equal to the link given in the beginning and not approved!
      // Intercept immediately, pause timer, and grill the user!
      event.preventDefault();
      event.stopPropagation();

      // Pause timer immediately
      chrome.runtime.sendMessage<ExtensionMessage>({ type: 'PAUSE_SESSION' });

      navigationGuard.showPrompt(
        href,
        (approvedUrl) => {
          chrome.runtime.sendMessage<ExtensionMessage>({
            type: 'APPROVE_NAVIGATION',
            payload: { url: approvedUrl },
          });
          chrome.runtime.sendMessage<ExtensionMessage>({
            type: 'RESUME_SESSION',
          });
          window.location.href = approvedUrl;
        },
        () => {
          chrome.runtime.sendMessage<ExtensionMessage>({
            type: 'RESUME_SESSION',
          });
        }
      );
    } catch {}
  }, true);
}

// Request initial state and settings from background
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.sendMessage<ExtensionMessage, ExtensionResponse<SessionState>>(
    { type: 'GET_SESSION_STATE' },
    (res) => {
      if (res?.success && res.data) {
        syncWithSessionState(res.data);
      }
    }
  );

  chrome.runtime.sendMessage<ExtensionMessage, ExtensionResponse<ExtensionSettings>>(
    { type: 'GET_SETTINGS' },
    (res) => {
      if (res?.success && res.data) {
        currentSettings = res.data;
      }
    }
  );

  // Message dispatcher
  chrome.runtime.onMessage.addListener(
    (message: ExtensionMessage, _sender, sendResponse) => {
      switch (message.type) {
        case 'SESSION_STATE_UPDATED': {
          syncWithSessionState(message.payload);
          sendResponse({ success: true });
          break;
        }

        case 'REQUEST_PAUSE_MEDIA': {
          videoController.pauseAllMedia().then((wasPlaying) => {
            // Report playback state back to background
            chrome.runtime.sendMessage<ExtensionMessage>({
              type: 'REPORT_MEDIA_STATE',
              payload: { isPlaying: wasPlaying },
            });
            sendResponse({ success: true, isPlaying: wasPlaying });
          });
          return true; // Keep message port open for async response
        }

        case 'REQUEST_RESUME_MEDIA': {
          videoController.resumeMedia().then(() => {
            sendResponse({ success: true });
          });
          return true;
        }

        case 'CHECK_NAVIGATION_PERMISSION': {
          navigationGuard.showPrompt(
            message.payload.url,
            (approvedUrl) => {
              chrome.runtime.sendMessage<ExtensionMessage>({
                type: 'APPROVE_NAVIGATION',
                payload: { url: approvedUrl },
              });
            },
            () => {
              chrome.runtime.sendMessage<ExtensionMessage>({
                type: 'REJECT_NAVIGATION',
              });
            }
          );
          sendResponse({ success: true });
          break;
        }

        case 'SHOW_BLOCKED_NOTICE': {
          navigationGuard.showBlockedNotice(
            message.payload.blockedUrl,
            () => {
              chrome.runtime.sendMessage<ExtensionMessage>({
                type: 'REJECT_NAVIGATION',
              });
            }
          );
          sendResponse({ success: true });
          break;
        }

        case 'SHOW_REOPENED_PROMPT': {
          const subjectName = message.payload?.subjectName || '';
          const remainingMinutes = message.payload?.remainingMinutes || 20;
          const daysToGate = message.payload?.daysToGate || 485;
          navigationGuard.showReopenedPrompt(
            subjectName,
            remainingMinutes,
            daysToGate,
            () => {
              // User chooses to keep studying - RESUME TIMER!
              chrome.runtime.sendMessage<ExtensionMessage>({
                type: 'RESUME_SESSION',
              });
            },
            () => {
              // User chooses to quit session
              chrome.runtime.sendMessage<ExtensionMessage>({
                type: 'QUIT_SESSION',
              });
            }
          );
          sendResponse({ success: true });
          break;
        }

        case 'SHOW_INTERROGATION_PROMPT': {
          navigationGuard.showNewTabInterrogation(
            message.payload.subjectName,
            message.payload.remainingMinutes,
            message.payload.daysToGate,
            () => {
              chrome.runtime.sendMessage<ExtensionMessage>({
                type: 'INTERROGATION_A_CHOSEN',
              });
            },
            () => {
              chrome.runtime.sendMessage<ExtensionMessage>({
                type: 'INTERROGATION_B_RETURN',
              });
            }
          );
          sendResponse({ success: true });
          break;
        }

        case 'SHOW_STRIKE_WARNING': {
          navigationGuard.showStrikeWarning(
            message.payload.strike,
            message.payload.message,
            message.payload.isFinalCountdown,
            () => {
              if (message.payload.isFinalCountdown) {
                chrome.runtime.sendMessage<ExtensionMessage>({
                  type: 'QUIT_SESSION',
                });
              }
            }
          );
          sendResponse({ success: true });
          break;
        }
      }
      return false;
    }
  );
}
