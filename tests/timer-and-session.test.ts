import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionManager } from '../src/background/session-manager';
import { ScheduledSubject } from '../src/shared/types';

describe('Timer and Session State Architecture', () => {
  let sessionManager: SessionManager;

  const mockSubjects: ScheduledSubject[] = [
    {
      id: 'sub-1',
      name: 'Mathematics',
      url: 'https://example.com/math',
      durationMinutes: 40,
    },
    {
      id: 'sub-2',
      name: 'Operating Systems',
      url: 'https://example.com/os',
      durationMinutes: 35,
    },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-09T10:00:00Z'));
    sessionManager = new SessionManager();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts a session with valid deadline and status', async () => {
    const state = await sessionManager.startScheduledStudy(mockSubjects, 101);
    expect(state.status).toBe('RunningStudy');
    expect(state.mode).toBe('scheduled');
    expect(state.currentSubjectIndex).toBe(0);
    expect(state.managedTabId).toBe(101);
    expect(state.currentStudyUrl).toBe('https://example.com/math');
    // 40 mins = 2,400,000 ms
    expect(state.totalIntervalMs).toBe(2400000);
    expect(state.remainingMs).toBe(2400000);
    expect(state.deadline).toBe(Date.now() + 2400000);
  });

  it('pauses a session and freezes the remaining time', async () => {
    await sessionManager.startScheduledStudy(mockSubjects, 101);

    // Advance 15 minutes
    vi.advanceTimersByTime(15 * 60 * 1000);

    const paused = await sessionManager.pause();
    expect(paused.status).toBe('PausedStudy');
    expect(paused.deadline).toBeNull();
    // 40 - 15 = 25 minutes remaining
    expect(paused.remainingMs).toBe(25 * 60 * 1000);

    // Advance real time by 10 minutes while paused
    vi.advanceTimersByTime(10 * 60 * 1000);

    // Remaining time must remain frozen at 25 minutes
    expect(sessionManager.getState().remainingMs).toBe(25 * 60 * 1000);
  });

  it('resumes a paused session with a new correct deadline', async () => {
    await sessionManager.startScheduledStudy(mockSubjects, 101);
    vi.advanceTimersByTime(15 * 60 * 1000);
    await sessionManager.pause();

    // 10 minutes pass in real life while paused
    vi.advanceTimersByTime(10 * 60 * 1000);

    const resumed = await sessionManager.resume();
    expect(resumed.status).toBe('RunningStudy');
    expect(resumed.deadline).toBe(Date.now() + 25 * 60 * 1000);

    // Remaining time after 5 minutes of study is 20 minutes
    vi.advanceTimersByTime(5 * 60 * 1000);
    const nowRemaining = resumed.deadline! - Date.now();
    expect(nowRemaining).toBe(20 * 60 * 1000);
  });

  it('resets a session to initial duration while keeping rest of queue intact', async () => {
    await sessionManager.startScheduledStudy(mockSubjects, 101);
    vi.advanceTimersByTime(30 * 60 * 1000);

    const resetState = await sessionManager.reset();
    expect(resetState.status).toBe('RunningStudy');
    expect(resetState.currentSubjectIndex).toBe(0);
    expect(resetState.remainingMs).toBe(40 * 60 * 1000);
    expect(resetState.deadline).toBe(Date.now() + 40 * 60 * 1000);
    expect(resetState.scheduledQueue.length).toBe(2);
  });

  it('transitions automatically to the next subject when duration reaches zero', async () => {
    await sessionManager.startScheduledStudy(mockSubjects, 101);

    // Advance 40 minutes to deadline
    vi.advanceTimersByTime(40 * 60 * 1000);

    const transitionResult = await sessionManager.handleDeadlineExpired('trans-1');
    expect(transitionResult.transitioned).toBe(true);
    expect(transitionResult.action).toBe('NAVIGATE');
    expect(transitionResult.nextUrl).toBe('https://example.com/os');

    const nextState = transitionResult.state;
    expect(nextState.currentSubjectIndex).toBe(1);
    expect(nextState.currentStudyUrl).toBe('https://example.com/os');
    expect(nextState.totalIntervalMs).toBe(35 * 60 * 1000);
    expect(nextState.deadline).toBe(Date.now() + 35 * 60 * 1000);
  });

  it('completes the entire queue when the final subject ends', async () => {
    await sessionManager.startScheduledStudy(mockSubjects, 101);
    // Subject 1 finishes
    vi.advanceTimersByTime(40 * 60 * 1000);
    await sessionManager.handleDeadlineExpired('trans-1');

    // Subject 2 finishes (35 mins)
    vi.advanceTimersByTime(35 * 60 * 1000);
    const finalResult = await sessionManager.handleDeadlineExpired('trans-2');

    expect(finalResult.transitioned).toBe(true);
    expect(finalResult.action).toBe('COMPLETE');
    expect(finalResult.state.status).toBe('Completed');
    expect(finalResult.state.deadline).toBeNull();
    expect(finalResult.state.completedAt).toBe(Date.now());
  });

  it('is idempotent: ignores duplicate transition processing', async () => {
    await sessionManager.startScheduledStudy(mockSubjects, 101);
    vi.advanceTimersByTime(40 * 60 * 1000);

    const first = await sessionManager.handleDeadlineExpired('duplicate-trans-id');
    expect(first.transitioned).toBe(true);

    // Same transition ID fired again (e.g. race condition or double alarm)
    const second = await sessionManager.handleDeadlineExpired('duplicate-trans-id');
    expect(second.transitioned).toBe(false);
  });

  it('ignores stale alarms from old/paused sessions', async () => {
    await sessionManager.startScheduledStudy(mockSubjects, 101);
    await sessionManager.pause();

    // Alarm fires while session is paused
    const result = await sessionManager.handleDeadlineExpired('alarm-while-paused');
    expect(result.transitioned).toBe(false);
    expect(sessionManager.getState().status).toBe('PausedStudy');
  });

  it('recovers accurately from persistent storage', async () => {
    const original = await sessionManager.startScheduledStudy(mockSubjects, 101);
    expect(original.id).toBeTruthy();

    // Create a new session manager instance as if service worker just woke up
    const recoveredManager = new SessionManager();
    const loaded = await recoveredManager.loadInitialState();

    expect(loaded.id).toBe(original.id);
    expect(loaded.status).toBe('RunningStudy');
    expect(loaded.deadline).toBe(original.deadline);
    expect(loaded.currentStudyUrl).toBe('https://example.com/math');
  });

  it('preserves the timer and updates approved URLs during navigation', async () => {
    await sessionManager.startScheduledStudy(mockSubjects, 101);
    vi.advanceTimersByTime(10 * 60 * 1000);

    const updated = await sessionManager.approveNavigation('https://example.com/math/chapter2');
    expect(updated.currentStudyUrl).toBe('https://example.com/math/chapter2');
    expect(updated.approvedUrls).toContain('https://example.com/math/chapter2');
    // Timer remains running and deadline is untouched!
    expect(updated.deadline).toBe(Date.now() + 30 * 60 * 1000);
    expect(updated.status).toBe('RunningStudy');
  });
});
