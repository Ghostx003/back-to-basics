import {
  INITIAL_SESSION_STATE,
  PomodoroSubject,
  ScheduledSubject,
  SessionState,
} from '../shared/types';
import { ExtensionStorage } from '../storage/storage';

export class SessionManager {
  private state: SessionState = { ...INITIAL_SESSION_STATE };
  private onStateChangeCallbacks: Array<(state: SessionState) => void> = [];

  private initPromise: Promise<SessionState>;

  constructor() {
    this.initPromise = this.loadInitialState();
  }

  public async loadInitialState(): Promise<SessionState> {
    this.state = await ExtensionStorage.getSessionState();
    return this.state;
  }

  public getState(): SessionState {
    return { ...this.state };
  }

  public subscribe(cb: (state: SessionState) => void): () => void {
    this.onStateChangeCallbacks.push(cb);
    return () => {
      this.onStateChangeCallbacks = this.onStateChangeCallbacks.filter((c) => c !== cb);
    };
  }

  private async updateState(patch: Partial<SessionState>): Promise<SessionState> {
    await this.initPromise;
    this.state = {
      ...this.state,
      ...patch,
    };
    await ExtensionStorage.saveSessionState(this.state);
    for (const cb of this.onStateChangeCallbacks) {
      try {
        cb(this.state);
      } catch (err) {
        console.error('Error in state change callback:', err);
      }
    }
    return this.state;
  }

  /**
   * Starts a Scheduled Study session.
   */
  public async startScheduledStudy(
    subjects: ScheduledSubject[],
    tabId: number | null
  ): Promise<SessionState> {
    if (!subjects || subjects.length === 0) {
      throw new Error('At least one subject is required.');
    }

    const firstSubject = subjects[0];
    const durationMs = Math.round(firstSubject.durationMinutes * 60 * 1000);
    const now = Date.now();
    const sessionId = `sched_${now}_${Math.random().toString(36).substring(2, 7)}`;

    return await this.updateState({
      id: sessionId,
      mode: 'scheduled',
      status: 'RunningStudy',
      scheduledQueue: subjects,
      pomodoroQueue: [],
      currentSubjectIndex: 0,
      currentPomodoroSession: 1,
      totalIntervalMs: durationMs,
      remainingMs: durationMs,
      deadline: now + durationMs,
      managedTabId: tabId,
      currentStudyUrl: firstSubject.url,
      approvedUrls: [firstSubject.url],
      pendingNavigationUrl: null,
      wasMediaPlayingBeforeBreak: false,
      startedAt: now,
      completedAt: null,
      errorMessage: undefined,
      lastTransitionProcessedId: undefined,
      violationCount: 0,
      isInterrogating: false,
    });
  }

  /**
   * Starts a Pomodoro study session.
   */
  public async startPomodoro(
    subjects: PomodoroSubject[],
    tabId: number | null
  ): Promise<SessionState> {
    if (!subjects || subjects.length === 0) {
      throw new Error('At least one Pomodoro subject is required.');
    }

    const firstSubject = subjects[0];
    const durationMs = Math.round(firstSubject.studyDurationMinutes * 60 * 1000);
    const now = Date.now();
    const sessionId = `pomo_${now}_${Math.random().toString(36).substring(2, 7)}`;

    return await this.updateState({
      id: sessionId,
      mode: 'pomodoro',
      status: 'RunningStudy',
      scheduledQueue: [],
      pomodoroQueue: subjects,
      currentSubjectIndex: 0,
      currentPomodoroSession: 1,
      totalIntervalMs: durationMs,
      remainingMs: durationMs,
      deadline: now + durationMs,
      managedTabId: tabId,
      currentStudyUrl: firstSubject.url,
      approvedUrls: [firstSubject.url],
      pendingNavigationUrl: null,
      wasMediaPlayingBeforeBreak: false,
      startedAt: now,
      completedAt: null,
      errorMessage: undefined,
      lastTransitionProcessedId: undefined,
      violationCount: 0,
      isInterrogating: false,
    });
  }

  /**
   * Pauses study timer when a new tab opens awaiting interrogation.
   * Freezes the remaining time so no time is lost while answering.
   */
  public async pauseForInterrogation(): Promise<SessionState> {
    if (this.state.status !== 'RunningStudy' && this.state.status !== 'RunningBreak') {
      return this.state;
    }

    const now = Date.now();
    const remaining = this.state.deadline ? Math.max(0, this.state.deadline - now) : this.state.remainingMs;

    return await this.updateState({
      remainingMs: remaining,
      deadline: null,
      isInterrogating: true,
    });
  }

  /**
   * Resumes study timer with exact remaining time after interrogation concludes.
   */
  public async resumeFromInterrogation(): Promise<SessionState> {
    const now = Date.now();
    const remaining = this.state.remainingMs > 0 ? this.state.remainingMs : this.state.totalIntervalMs;
    const newDeadline = now + remaining;

    return await this.updateState({
      status: 'RunningStudy',
      remainingMs: remaining,
      deadline: newDeadline,
      isInterrogating: false,
    });
  }

  /**
   * Increments violation count up to 3 strikes.
   */
  public async recordViolation(): Promise<{ violationCount: number; shouldTerminate: boolean }> {
    const nextCount = this.state.violationCount + 1;
    await this.updateState({ violationCount: nextCount });
    return {
      violationCount: nextCount,
      shouldTerminate: nextCount >= 3,
    };
  }

  public getCurrentSubjectName(): string {
    if (this.state.mode === 'scheduled') {
      const sub = this.state.scheduledQueue[this.state.currentSubjectIndex];
      return sub?.name?.trim() || '';
    } else {
      const sub = this.state.pomodoroQueue[this.state.currentSubjectIndex];
      return sub?.name?.trim() || '';
    }
  }

  /**
   * Pauses an active study session. Freezes remaining time.
   */
  public async pause(): Promise<SessionState> {
    if (this.state.status !== 'RunningStudy' && this.state.status !== 'RunningBreak') {
      return this.state;
    }

    const now = Date.now();
    const remaining = this.state.deadline ? Math.max(0, this.state.deadline - now) : this.state.remainingMs;

    return await this.updateState({
      status: this.state.status === 'RunningStudy' ? 'PausedStudy' : 'RunningBreak', // By design, breaks enforce rest
      remainingMs: remaining,
      deadline: null,
    });
  }

  /**
   * Resumes a paused study session. Calculates a fresh deadline.
   */
  public async resume(): Promise<SessionState> {
    // Resume allowed if PausedStudy OR if RunningStudy with null deadline or isInterrogating
    if (
      this.state.status !== 'PausedStudy' &&
      !(this.state.status === 'RunningStudy' && (!this.state.deadline || this.state.isInterrogating))
    ) {
      return this.state;
    }

    const now = Date.now();
    const remaining = this.state.remainingMs > 0 ? this.state.remainingMs : this.state.totalIntervalMs;
    const newDeadline = now + remaining;

    return await this.updateState({
      status: 'RunningStudy',
      remainingMs: remaining,
      deadline: newDeadline,
      isInterrogating: false,
    });
  }

  /**
   * Resets the current session to its initial duration without restarting the entire queue.
   */
  public async reset(): Promise<SessionState> {
    if (this.state.status === 'Idle' || this.state.status === 'Completed') {
      return this.state;
    }

    const now = Date.now();
    let initialDurationMs = 0;

    if (this.state.mode === 'scheduled') {
      const currentSubject = this.state.scheduledQueue[this.state.currentSubjectIndex];
      initialDurationMs = currentSubject ? Math.round(currentSubject.durationMinutes * 60 * 1000) : 0;
      
      return await this.updateState({
        status: 'RunningStudy',
        totalIntervalMs: initialDurationMs,
        remainingMs: initialDurationMs,
        deadline: now + initialDurationMs,
      });
    } else {
      const currentSubject = this.state.pomodoroQueue[this.state.currentSubjectIndex];
      if (!currentSubject) return this.state;

      if (this.state.status === 'RunningBreak') {
        initialDurationMs = Math.round(currentSubject.breakDurationMinutes * 60 * 1000);
        return await this.updateState({
          status: 'RunningBreak',
          totalIntervalMs: initialDurationMs,
          remainingMs: initialDurationMs,
          deadline: now + initialDurationMs,
        });
      } else {
        initialDurationMs = Math.round(currentSubject.studyDurationMinutes * 60 * 1000);
        return await this.updateState({
          status: 'RunningStudy',
          totalIntervalMs: initialDurationMs,
          remainingMs: initialDurationMs,
          deadline: now + initialDurationMs,
        });
      }
    }
  }

  /**
   * Skips the active break immediately and resumes study.
   */
  public async skipBreak(): Promise<SessionState> {
    if (this.state.status !== 'RunningBreak' || this.state.mode !== 'pomodoro') {
      return this.state;
    }

    const result = await this.advancePomodoroAfterBreak();
    return result.state;
  }

  /**
   * Handles deadline expiration idempotently.
   */
  public async handleDeadlineExpired(transitionId: string): Promise<{
    transitioned: boolean;
    state: SessionState;
    action?: 'NAVIGATE' | 'SHOW_BREAK' | 'END_BREAK' | 'COMPLETE';
    nextUrl?: string;
  }> {
    // Stale check
    if (
      this.state.status !== 'RunningStudy' &&
      this.state.status !== 'RunningBreak'
    ) {
      return { transitioned: false, state: this.state };
    }

    // Idempotency check: if this specific transition was already processed
    if (this.state.lastTransitionProcessedId === transitionId) {
      return { transitioned: false, state: this.state };
    }

    if (this.state.mode === 'scheduled') {
      return await this.transitionScheduledStudy(transitionId);
    } else {
      return await this.transitionPomodoro(transitionId);
    }
  }

  private async transitionScheduledStudy(transitionId: string): Promise<{
    transitioned: boolean;
    state: SessionState;
    action: 'NAVIGATE' | 'COMPLETE';
    nextUrl?: string;
  }> {
    const nextIndex = this.state.currentSubjectIndex + 1;
    const now = Date.now();

    if (nextIndex < this.state.scheduledQueue.length) {
      const nextSubject = this.state.scheduledQueue[nextIndex];
      const durationMs = Math.round(nextSubject.durationMinutes * 60 * 1000);

      const updated = await this.updateState({
        currentSubjectIndex: nextIndex,
        currentStudyUrl: nextSubject.url,
        approvedUrls: [...this.state.approvedUrls, nextSubject.url],
        totalIntervalMs: durationMs,
        remainingMs: durationMs,
        deadline: now + durationMs,
        lastTransitionProcessedId: transitionId,
      });

      return {
        transitioned: true,
        state: updated,
        action: 'NAVIGATE',
        nextUrl: nextSubject.url,
      };
    } else {
      // Completed entire scheduled study queue
      const updated = await this.updateState({
        status: 'Completed',
        deadline: null,
        remainingMs: 0,
        completedAt: now,
        lastTransitionProcessedId: transitionId,
      });

      return {
        transitioned: true,
        state: updated,
        action: 'COMPLETE',
      };
    }
  }

  private async transitionPomodoro(transitionId: string): Promise<{
    transitioned: boolean;
    state: SessionState;
    action?: 'SHOW_BREAK' | 'NAVIGATE' | 'COMPLETE' | 'END_BREAK';
    nextUrl?: string;
  }> {
    const currentSubject = this.state.pomodoroQueue[this.state.currentSubjectIndex];
    if (!currentSubject) {
      const updated = await this.updateState({ status: 'Completed', deadline: null });
      return { transitioned: true, state: updated, action: 'COMPLETE' };
    }

    const now = Date.now();

    if (this.state.status === 'RunningStudy') {
      // Check if this was the last session for this subject
      if (this.state.currentPomodoroSession >= currentSubject.sessions) {
        // Final session of this subject complete!
        // Prompt rule: By default, do not force an additional break after the final session of a subject.
        const nextSubjectIndex = this.state.currentSubjectIndex + 1;

        if (nextSubjectIndex < this.state.pomodoroQueue.length) {
          // Advance to next subject
          const nextSubject = this.state.pomodoroQueue[nextSubjectIndex];
          const durationMs = Math.round(nextSubject.studyDurationMinutes * 60 * 1000);

          const updated = await this.updateState({
            currentSubjectIndex: nextSubjectIndex,
            currentPomodoroSession: 1,
            currentStudyUrl: nextSubject.url,
            approvedUrls: [...this.state.approvedUrls, nextSubject.url],
            status: 'RunningStudy',
            totalIntervalMs: durationMs,
            remainingMs: durationMs,
            deadline: now + durationMs,
            lastTransitionProcessedId: transitionId,
          });

          return {
            transitioned: true,
            state: updated,
            action: 'NAVIGATE',
            nextUrl: nextSubject.url,
          };
        } else {
          // All Pomodoro subjects complete!
          const updated = await this.updateState({
            status: 'Completed',
            deadline: null,
            remainingMs: 0,
            completedAt: now,
            lastTransitionProcessedId: transitionId,
          });

          return {
            transitioned: true,
            state: updated,
            action: 'COMPLETE',
          };
        }
      } else {
        // Study session ended, start break!
        const breakMs = Math.round(currentSubject.breakDurationMinutes * 60 * 1000);

        const updated = await this.updateState({
          status: 'RunningBreak',
          totalIntervalMs: breakMs,
          remainingMs: breakMs,
          deadline: now + breakMs,
          lastTransitionProcessedId: transitionId,
        });

        return {
          transitioned: true,
          state: updated,
          action: 'SHOW_BREAK',
        };
      }
    } else if (this.state.status === 'RunningBreak') {
      // Break expired, advance to next study session
      return await this.advancePomodoroAfterBreak(transitionId);
    }

    return { transitioned: false, state: this.state, action: undefined };
  }

  public async advancePomodoroAfterBreak(transitionId?: string): Promise<{
    transitioned: boolean;
    state: SessionState;
    action: 'END_BREAK';
  }> {
    const currentSubject = this.state.pomodoroQueue[this.state.currentSubjectIndex];
    const now = Date.now();
    const durationMs = currentSubject
      ? Math.round(currentSubject.studyDurationMinutes * 60 * 1000)
      : 25 * 60 * 1000;

    const nextSessionNum = this.state.currentPomodoroSession + 1;

    const updated = await this.updateState({
      status: 'RunningStudy',
      currentPomodoroSession: nextSessionNum,
      totalIntervalMs: durationMs,
      remainingMs: durationMs,
      deadline: now + durationMs,
      lastTransitionProcessedId: transitionId || `skip_break_${now}`,
    });

    return {
      transitioned: true,
      state: updated,
      action: 'END_BREAK',
    };
  }

  public async setManagedTab(tabId: number | null): Promise<void> {
    await this.updateState({ managedTabId: tabId });
  }

  public async approveNavigation(url: string): Promise<SessionState> {
    return await this.updateState({
      currentStudyUrl: url,
      approvedUrls: [...this.state.approvedUrls, url],
      pendingNavigationUrl: null,
    });
  }

  public async setPendingNavigation(url: string | null): Promise<SessionState> {
    return await this.updateState({
      pendingNavigationUrl: url,
    });
  }

  public async setMediaPlayingState(isPlaying: boolean): Promise<void> {
    await this.updateState({
      wasMediaPlayingBeforeBreak: isPlaying,
    });
  }

  public async quitSession(): Promise<SessionState> {
    return await this.updateState({
      status: 'Idle',
      deadline: null,
      remainingMs: 0,
      totalIntervalMs: 0,
      managedTabId: null,
      currentStudyUrl: null,
      pendingNavigationUrl: null,
      startedAt: null,
      completedAt: null,
    });
  }
}
