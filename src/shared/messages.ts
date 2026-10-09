import {
  ExtensionSettings,
  PomodoroSubject,
  ScheduledSubject,
  SessionState,
} from './types';

export type ExtensionMessage =
  | { type: 'GET_SESSION_STATE' }
  | { type: 'SESSION_STATE_RESPONSE'; payload: SessionState }
  | { type: 'SESSION_STATE_UPDATED'; payload: SessionState }
  | {
      type: 'START_SCHEDULED_STUDY';
      payload: { subjects: ScheduledSubject[] };
    }
  | {
      type: 'START_POMODORO';
      payload: { subjects: PomodoroSubject[] };
    }
  | { type: 'PAUSE_SESSION' }
  | { type: 'RESUME_SESSION' }
  | { type: 'RESET_SESSION' }
  | { type: 'SKIP_BREAK' }
  | { type: 'APPROVE_NAVIGATION'; payload: { url: string } }
  | { type: 'REJECT_NAVIGATION' }
  | { type: 'GET_SETTINGS' }
  | { type: 'SETTINGS_RESPONSE'; payload: ExtensionSettings }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<ExtensionSettings> }
  | { type: 'REPORT_MEDIA_STATE'; payload: { isPlaying: boolean } }
  | { type: 'CHECK_NAVIGATION_PERMISSION'; payload: { url: string } }
  | { type: 'REQUEST_PAUSE_MEDIA' }
  | { type: 'REQUEST_RESUME_MEDIA' }
  | { type: 'SHOW_BLOCKED_NOTICE'; payload: { blockedUrl: string } }
  | { type: 'SHOW_REOPENED_PROMPT' }
  | { type: 'QUIT_SESSION' }
  | { type: 'CONTENT_SCRIPT_PING' };

export type ExtensionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};
