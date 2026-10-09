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
  | { type: 'SHOW_INTERROGATION_PROMPT'; payload: { subjectName: string; remainingMinutes: number; daysToGate: number } }
  | { type: 'SHOW_STRIKE_WARNING'; payload: { strike: number; message: string; isFinalCountdown?: boolean } }
  | { type: 'INTERROGATION_A_CHOSEN' }
  | { type: 'INTERROGATION_B_RETURN' }
  | { type: 'QUIT_SESSION' }
  | { type: 'GET_ANALYTICS' }
  | { type: 'ADD_CUSTOM_BLACKLIST'; payload: { domain: string } }
  | { type: 'REMOVE_CUSTOM_BLACKLIST'; payload: { domain: string } }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'CONTENT_SCRIPT_PING' };

export type ExtensionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};
