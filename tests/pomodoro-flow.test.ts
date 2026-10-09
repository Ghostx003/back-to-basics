import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionManager } from '../src/background/session-manager';
import { PomodoroSubject } from '../src/shared/types';

describe('Pomodoro Flow and State Transitions', () => {
  let sessionManager: SessionManager;

  const mockPomodoroSubjects: PomodoroSubject[] = [
    {
      id: 'pomo-1',
      name: 'Operating Systems',
      url: 'https://example.com/os-lecture',
      sessions: 2,
      studyDurationMinutes: 25,
      breakDurationMinutes: 5,
    },
    {
      id: 'pomo-2',
      name: 'Computer Networks',
      url: 'https://example.com/networks',
      sessions: 1,
      studyDurationMinutes: 50,
      breakDurationMinutes: 10,
    },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-09T14:00:00Z'));
    sessionManager = new SessionManager();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts a 25-minute Pomodoro session correctly', async () => {
    const state = await sessionManager.startPomodoro(mockPomodoroSubjects, 202);
    expect(state.status).toBe('RunningStudy');
    expect(state.mode).toBe('pomodoro');
    expect(state.currentSubjectIndex).toBe(0);
    expect(state.currentPomodoroSession).toBe(1);
    expect(state.totalIntervalMs).toBe(25 * 60 * 1000);
    expect(state.deadline).toBe(Date.now() + 25 * 60 * 1000);
  });

  it('transitions to break when study interval expires and triggers SHOW_BREAK', async () => {
    await sessionManager.startPomodoro(mockPomodoroSubjects, 202);

    // Track that media was playing
    await sessionManager.setMediaPlayingState(true);

    // Advance 25 mins
    vi.advanceTimersByTime(25 * 60 * 1000);

    const result = await sessionManager.handleDeadlineExpired('study-1-done');
    expect(result.transitioned).toBe(true);
    expect(result.action).toBe('SHOW_BREAK');
    expect(result.state.status).toBe('RunningBreak');
    expect(result.state.totalIntervalMs).toBe(5 * 60 * 1000); // 5 min break
    expect(result.state.deadline).toBe(Date.now() + 5 * 60 * 1000);
    expect(result.state.wasMediaPlayingBeforeBreak).toBe(true);
  });

  it('ends break and begins session 2 of subject automatically', async () => {
    await sessionManager.startPomodoro(mockPomodoroSubjects, 202);
    vi.advanceTimersByTime(25 * 60 * 1000);
    await sessionManager.handleDeadlineExpired('study-1-done');

    // 5 minutes break passes
    vi.advanceTimersByTime(5 * 60 * 1000);
    const breakDoneResult = await sessionManager.handleDeadlineExpired('break-1-done');

    expect(breakDoneResult.transitioned).toBe(true);
    expect(breakDoneResult.action).toBe('END_BREAK');
    expect(breakDoneResult.state.status).toBe('RunningStudy');
    expect(breakDoneResult.state.currentPomodoroSession).toBe(2);
    expect(breakDoneResult.state.totalIntervalMs).toBe(25 * 60 * 1000);
  });

  it('skips break immediately when Skip Break is pressed', async () => {
    await sessionManager.startPomodoro(mockPomodoroSubjects, 202);
    vi.advanceTimersByTime(25 * 60 * 1000);
    await sessionManager.handleDeadlineExpired('study-1-done');

    // User is 1 minute into 5 min break and clicks skip
    vi.advanceTimersByTime(1 * 60 * 1000);
    const skipState = await sessionManager.skipBreak();

    expect(skipState.status).toBe('RunningStudy');
    expect(skipState.currentPomodoroSession).toBe(2);
    expect(skipState.totalIntervalMs).toBe(25 * 60 * 1000);
    expect(skipState.deadline).toBe(Date.now() + 25 * 60 * 1000);
  });

  it('does NOT force an extra break after the final session of a subject', async () => {
    await sessionManager.startPomodoro(mockPomodoroSubjects, 202);

    // Session 1: 25 min study
    vi.advanceTimersByTime(25 * 60 * 1000);
    await sessionManager.handleDeadlineExpired('s1-done');

    // Break: 5 min
    vi.advanceTimersByTime(5 * 60 * 1000);
    await sessionManager.handleDeadlineExpired('b1-done');

    // Session 2 (Final session for Subject 1): 25 min study
    vi.advanceTimersByTime(25 * 60 * 1000);
    const finalSessionResult = await sessionManager.handleDeadlineExpired('s2-done');

    // Requirement: "By default, do not force an additional break after the final session of a subject. Once the final study interval finishes, proceed to the next subject or the completion screen."
    expect(finalSessionResult.transitioned).toBe(true);
    expect(finalSessionResult.action).toBe('NAVIGATE');
    expect(finalSessionResult.nextUrl).toBe('https://example.com/networks');
    expect(finalSessionResult.state.currentSubjectIndex).toBe(1);
    expect(finalSessionResult.state.currentPomodoroSession).toBe(1);
    expect(finalSessionResult.state.status).toBe('RunningStudy');
    // Next subject has 50 min study interval
    expect(finalSessionResult.state.totalIntervalMs).toBe(50 * 60 * 1000);
  });

  it('completes the entire Pomodoro queue after the last subject ends', async () => {
    // Subject with 1 session
    const singleSubject: PomodoroSubject[] = [
      {
        id: 'p-single',
        name: 'Final Exam Review',
        url: 'https://example.com/review',
        sessions: 1,
        studyDurationMinutes: 25,
        breakDurationMinutes: 5,
      },
    ];

    await sessionManager.startPomodoro(singleSubject, 303);
    vi.advanceTimersByTime(25 * 60 * 1000);

    const result = await sessionManager.handleDeadlineExpired('single-done');
    expect(result.transitioned).toBe(true);
    expect(result.action).toBe('COMPLETE');
    expect(result.state.status).toBe('Completed');
  });

  it('resets correctly during a break', async () => {
    await sessionManager.startPomodoro(mockPomodoroSubjects, 202);
    vi.advanceTimersByTime(25 * 60 * 1000);
    await sessionManager.handleDeadlineExpired('study-done');

    // Advance 2 minutes into break
    vi.advanceTimersByTime(2 * 60 * 1000);

    // Reset during break restores full 5-minute break
    const resetBreak = await sessionManager.reset();
    expect(resetBreak.status).toBe('RunningBreak');
    expect(resetBreak.remainingMs).toBe(5 * 60 * 1000);
    expect(resetBreak.deadline).toBe(Date.now() + 5 * 60 * 1000);
  });
});
