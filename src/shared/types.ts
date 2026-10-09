export type SessionStatus =
  | 'Idle'
  | 'RunningStudy'
  | 'PausedStudy'
  | 'RunningBreak'
  | 'Completed'
  | 'Error';

export type SessionMode = 'scheduled' | 'pomodoro';

export interface ScheduledSubject {
  id: string;
  name: string;
  url: string;
  durationMinutes: number;
}

export interface PomodoroSubject {
  id: string;
  name: string;
  url: string;
  sessions: number; // total number of study intervals for this subject
  studyDurationMinutes: number; // 25, 50, or custom
  breakDurationMinutes: number; // 5 or custom
}

export interface SessionState {
  id: string; // Unique session ID for idempotency and stale alarm protection
  mode: SessionMode;
  status: SessionStatus;
  
  // Subject Queues
  scheduledQueue: ScheduledSubject[];
  pomodoroQueue: PomodoroSubject[];
  
  // Progress pointers
  currentSubjectIndex: number;
  currentPomodoroSession: number; // 1-indexed current interval for active subject
  
  // Timing
  deadline: number | null; // Epoch ms when the current active countdown finishes
  remainingMs: number; // Milliseconds remaining (frozen when paused)
  totalIntervalMs: number; // Total length of current interval (for % progress)
  
  // Managed Tab & Navigation
  managedTabId: number | null;
  currentStudyUrl: string | null;
  approvedUrls: string[];
  pendingNavigationUrl: string | null;
  
  // Media State
  wasMediaPlayingBeforeBreak: boolean;
  
  // Metadata & Enforcement
  startedAt: number | null;
  completedAt: number | null;
  errorMessage?: string;
  lastTransitionProcessedId?: string; // Tracks the last processed transition ID to prevent duplicate firing
  violationCount: number; // 3-strike violation tracker
  isInterrogating: boolean; // paused while new-tab interrogation modal is open
}

export interface WebsiteVisit {
  domain: string;
  totalSeconds: number;
  visitCount: number;
  lastVisited: number;
  isCustomBlocked?: boolean;
}

export interface CompletedSessionLog {
  id: string;
  mode: SessionMode;
  subjectName: string;
  startedAt: number;
  endedAt: number;
  durationMinutes: number;
  status: 'Completed' | 'Terminated' | 'Interrupted';
}

export interface StudyAnalytics {
  totalSecondsStudied: number;
  completedPomodoroCount: number;
  dailyStudySeconds: Record<string, number>; // YYYY-MM-DD -> seconds
  sessions: CompletedSessionLog[];
  websiteVisits: Record<string, WebsiteVisit>;
  customBlacklist: string[];
}

export const INITIAL_ANALYTICS: StudyAnalytics = {
  totalSecondsStudied: 0,
  completedPomodoroCount: 0,
  dailyStudySeconds: {},
  sessions: [],
  websiteVisits: {},
  customBlacklist: [],
};

/**
 * Calculates dynamic days remaining until GATE CSE on 7 February 2027
 */
export function getDaysToGateCSE(currentDate = new Date()): number {
  const examDate = new Date('2027-02-07T00:00:00');
  const diffMs = examDate.getTime() - currentDate.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export interface ExtensionSettings {
  soundEnabled: boolean; // 30-second ticking sound
  pauseOnTabSwitch: boolean; // User-controlled optional feature
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  soundEnabled: true,
  pauseOnTabSwitch: false,
};

export const INITIAL_SESSION_STATE: SessionState = {
  id: '',
  mode: 'scheduled',
  status: 'Idle',
  scheduledQueue: [],
  pomodoroQueue: [],
  currentSubjectIndex: 0,
  currentPomodoroSession: 1,
  deadline: null,
  remainingMs: 0,
  totalIntervalMs: 0,
  managedTabId: null,
  currentStudyUrl: null,
  approvedUrls: [],
  pendingNavigationUrl: null,
  wasMediaPlayingBeforeBreak: false,
  startedAt: null,
  completedAt: null,
  violationCount: 0,
  isInterrogating: false,
};
