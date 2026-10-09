import { ExtensionMessage, ExtensionResponse } from '../shared/messages';
import { ExtensionSettings, SessionState } from '../shared/types';
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
          navigationGuard.showReopenedPrompt(
            () => {
              // User chooses to keep studying
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
      }
      return false;
    }
  );
}
