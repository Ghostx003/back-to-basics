import {
  CompletedSessionLog,
  DEFAULT_SETTINGS,
  ExtensionSettings,
  INITIAL_ANALYTICS,
  INITIAL_SESSION_STATE,
  PomodoroSubject,
  ScheduledSubject,
  SessionState,
  StudyAnalytics,
} from '../shared/types';

const STORAGE_KEYS = {
  SESSION_STATE: 'b2b_session_state',
  SCHEDULED_CONFIG: 'b2b_scheduled_config',
  POMODORO_CONFIG: 'b2b_pomodoro_config',
  SETTINGS: 'b2b_settings',
  ANALYTICS: 'b2b_study_analytics',
} as const;

// Default initial templates to help users start immediately with sensible defaults
export const DEFAULT_SCHEDULED_SUBJECTS: ScheduledSubject[] = [
  {
    id: 's1',
    name: 'Mathematics',
    url: 'https://en.wikipedia.org/wiki/Mathematics',
    durationMinutes: 40,
  },
  {
    id: 's2',
    name: 'Operating Systems',
    url: 'https://en.wikipedia.org/wiki/Operating_system',
    durationMinutes: 35,
  },
];

export const DEFAULT_POMODORO_SUBJECTS: PomodoroSubject[] = [
  {
    id: 'p1',
    name: 'Operating Systems',
    url: 'https://en.wikipedia.org/wiki/Operating_system',
    sessions: 3,
    studyDurationMinutes: 25,
    breakDurationMinutes: 5,
  },
];

/**
 * Safe wrapper around chrome.storage.local with fallback for non-extension environments (tests).
 */
export class ExtensionStorage {
  private static isChromeStorageAvailable(): boolean {
    return (
      typeof chrome !== 'undefined' &&
      !!chrome.storage &&
      !!chrome.storage.local
    );
  }

  static async getSessionState(): Promise<SessionState> {
    if (this.isChromeStorageAvailable()) {
      return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.SESSION_STATE], (result) => {
          resolve(result[STORAGE_KEYS.SESSION_STATE] || INITIAL_SESSION_STATE);
        });
      });
    }

    // Fallback to localStorage/memory
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SESSION_STATE);
      return raw ? JSON.parse(raw) : INITIAL_SESSION_STATE;
    } catch {
      return INITIAL_SESSION_STATE;
    }
  }

  static async saveSessionState(state: SessionState): Promise<void> {
    if (this.isChromeStorageAvailable()) {
      return new Promise((resolve) => {
        chrome.storage.local.set(
          { [STORAGE_KEYS.SESSION_STATE]: state },
          () => resolve()
        );
      });
    }

    try {
      localStorage.setItem(STORAGE_KEYS.SESSION_STATE, JSON.stringify(state));
    } catch {
      // Ignore in mock environment
    }
  }

  static async getScheduledConfig(): Promise<ScheduledSubject[]> {
    if (this.isChromeStorageAvailable()) {
      return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.SCHEDULED_CONFIG], (result) => {
          resolve(result[STORAGE_KEYS.SCHEDULED_CONFIG] || DEFAULT_SCHEDULED_SUBJECTS);
        });
      });
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SCHEDULED_CONFIG);
      return raw ? JSON.parse(raw) : DEFAULT_SCHEDULED_SUBJECTS;
    } catch {
      return DEFAULT_SCHEDULED_SUBJECTS;
    }
  }

  static async saveScheduledConfig(subjects: ScheduledSubject[]): Promise<void> {
    if (this.isChromeStorageAvailable()) {
      return new Promise((resolve) => {
        chrome.storage.local.set(
          { [STORAGE_KEYS.SCHEDULED_CONFIG]: subjects },
          () => resolve()
        );
      });
    }

    try {
      localStorage.setItem(STORAGE_KEYS.SCHEDULED_CONFIG, JSON.stringify(subjects));
    } catch {}
  }

  static async getPomodoroConfig(): Promise<PomodoroSubject[]> {
    if (this.isChromeStorageAvailable()) {
      return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.POMODORO_CONFIG], (result) => {
          resolve(result[STORAGE_KEYS.POMODORO_CONFIG] || DEFAULT_POMODORO_SUBJECTS);
        });
      });
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.POMODORO_CONFIG);
      return raw ? JSON.parse(raw) : DEFAULT_POMODORO_SUBJECTS;
    } catch {
      return DEFAULT_POMODORO_SUBJECTS;
    }
  }

  static async savePomodoroConfig(subjects: PomodoroSubject[]): Promise<void> {
    if (this.isChromeStorageAvailable()) {
      return new Promise((resolve) => {
        chrome.storage.local.set(
          { [STORAGE_KEYS.POMODORO_CONFIG]: subjects },
          () => resolve()
        );
      });
    }

    try {
      localStorage.setItem(STORAGE_KEYS.POMODORO_CONFIG, JSON.stringify(subjects));
    } catch {}
  }

  static async getSettings(): Promise<ExtensionSettings> {
    if (this.isChromeStorageAvailable()) {
      return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.SETTINGS], (result) => {
          resolve(result[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS);
        });
      });
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return raw ? JSON.parse(raw) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  static async saveSettings(settings: ExtensionSettings): Promise<void> {
    if (this.isChromeStorageAvailable()) {
      return new Promise((resolve) => {
        chrome.storage.local.set(
          { [STORAGE_KEYS.SETTINGS]: settings },
          () => resolve()
        );
      });
    }

    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {}
  }

  static async getAnalytics(): Promise<StudyAnalytics> {
    if (this.isChromeStorageAvailable()) {
      return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.ANALYTICS], (result) => {
          resolve(result[STORAGE_KEYS.ANALYTICS] || INITIAL_ANALYTICS);
        });
      });
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ANALYTICS);
      return raw ? JSON.parse(raw) : INITIAL_ANALYTICS;
    } catch {
      return INITIAL_ANALYTICS;
    }
  }

  static async saveAnalytics(analytics: StudyAnalytics): Promise<void> {
    if (this.isChromeStorageAvailable()) {
      return new Promise((resolve) => {
        chrome.storage.local.set(
          { [STORAGE_KEYS.ANALYTICS]: analytics },
          () => resolve()
        );
      });
    }

    try {
      localStorage.setItem(STORAGE_KEYS.ANALYTICS, JSON.stringify(analytics));
    } catch {}
  }

  static async recordSessionLog(log: CompletedSessionLog): Promise<void> {
    const current = await this.getAnalytics();
    const todayKey = new Date().toISOString().split('T')[0];
    const logSeconds = Math.round(log.durationMinutes * 60);
    const updatedDaily = {
      ...(current.dailyStudySeconds || {}),
      [todayKey]: ((current.dailyStudySeconds || {})[todayKey] || 0) + logSeconds,
    };

    const updated: StudyAnalytics = {
      ...current,
      totalSecondsStudied: current.totalSecondsStudied + logSeconds,
      dailyStudySeconds: updatedDaily,
      completedPomodoroCount:
        log.mode === 'pomodoro' && log.status === 'Completed'
          ? current.completedPomodoroCount + 1
          : current.completedPomodoroCount,
      sessions: [log, ...current.sessions].slice(0, 100), // Keep last 100 sessions
    };
    await this.saveAnalytics(updated);
  }

  static async trackWebsiteTime(domain: string, seconds: number): Promise<void> {
    if (!domain || seconds <= 0) return;
    const current = await this.getAnalytics();
    const todayKey = new Date().toISOString().split('T')[0];
    const updatedDaily = {
      ...(current.dailyStudySeconds || {}),
      [todayKey]: ((current.dailyStudySeconds || {})[todayKey] || 0) + seconds,
    };

    const existing = current.websiteVisits[domain] || {
      domain,
      totalSeconds: 0,
      visitCount: 0,
      lastVisited: Date.now(),
      isCustomBlocked: current.customBlacklist.includes(domain),
    };

    const updatedVisits = {
      ...current.websiteVisits,
      [domain]: {
        ...existing,
        totalSeconds: existing.totalSeconds + seconds,
        visitCount: existing.visitCount + 1,
        lastVisited: Date.now(),
        isCustomBlocked: current.customBlacklist.includes(domain),
      },
    };

    await this.saveAnalytics({
      ...current,
      totalSecondsStudied: current.totalSecondsStudied + seconds,
      dailyStudySeconds: updatedDaily,
      websiteVisits: updatedVisits,
    });
  }

  static async addCustomBlacklistDomain(domain: string): Promise<StudyAnalytics> {
    const norm = domain.toLowerCase().trim();
    if (!norm) return await this.getAnalytics();
    const current = await this.getAnalytics();
    if (current.customBlacklist.includes(norm)) return current;

    const updatedList = [...current.customBlacklist, norm];
    const updatedVisits = { ...current.websiteVisits };
    if (updatedVisits[norm]) {
      updatedVisits[norm] = { ...updatedVisits[norm], isCustomBlocked: true };
    }

    const updated: StudyAnalytics = {
      ...current,
      customBlacklist: updatedList,
      websiteVisits: updatedVisits,
    };
    await this.saveAnalytics(updated);
    return updated;
  }

  static async removeCustomBlacklistDomain(domain: string): Promise<StudyAnalytics> {
    const norm = domain.toLowerCase().trim();
    const current = await this.getAnalytics();
    const updatedList = current.customBlacklist.filter((d) => d !== norm);
    const updatedVisits = { ...current.websiteVisits };
    if (updatedVisits[norm]) {
      updatedVisits[norm] = { ...updatedVisits[norm], isCustomBlocked: false };
    }

    const updated: StudyAnalytics = {
      ...current,
      customBlacklist: updatedList,
      websiteVisits: updatedVisits,
    };
    await this.saveAnalytics(updated);
    return updated;
  }

  static async clearAnalytics(): Promise<void> {
    await this.saveAnalytics(INITIAL_ANALYTICS);
  }
}
