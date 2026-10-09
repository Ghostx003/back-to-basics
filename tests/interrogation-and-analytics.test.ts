import { beforeEach, describe, expect, it } from 'vitest';
import { SessionManager } from '../src/background/session-manager';
import { isBlockedUrl } from '../src/shared/blocklist';
import { getDaysToGateCSE, PomodoroSubject } from '../src/shared/types';
import { ExtensionStorage } from '../src/storage/storage';

describe('Interrogation, 3-Strike Enforcement & Productivity Analytics', () => {
  beforeEach(async () => {
    await ExtensionStorage.clearAnalytics();
  });

  it('calculates days to GATE CSE 2027 dynamically using 7 February 2027', () => {
    const daysLeft = getDaysToGateCSE();
    expect(daysLeft).toBeGreaterThan(0);
    // Verified against 2027-02-07
    const examDate = new Date('2027-02-07T00:00:00');
    const expected = Math.max(
      0,
      Math.ceil((examDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    );
    expect(daysLeft).toBe(expected);
  });

  it('pauses and resumes study timer during interrogation without resetting remaining time', async () => {
    const sessionManager = new SessionManager();
    const subjects: PomodoroSubject[] = [
      {
        id: 'p1',
        name: 'Algorithms & Data Structures',
        url: 'https://youtube.com/watch?v=algo',
        studyDurationMinutes: 25,
        breakDurationMinutes: 5,
        sessions: 1,
      },
    ];

    // Start session
    const started = await sessionManager.startPomodoro(subjects, 101);
    expect(started.status).toBe('RunningStudy');
    expect(started.deadline).not.toBeNull();
    const originalRemaining = started.remainingMs;
    expect(originalRemaining).toBe(25 * 60 * 1000);

    // Trigger new-tab interrogation
    const paused = await sessionManager.pauseForInterrogation();
    expect(paused.isInterrogating).toBe(true);
    expect(paused.deadline).toBeNull();
    // Remaining time must be frozen/preserved
    expect(paused.remainingMs).toBeLessThanOrEqual(originalRemaining);
    expect(paused.remainingMs).toBeGreaterThan(originalRemaining - 100);

    // Subject name accountability check
    expect(sessionManager.getCurrentSubjectName()).toBe('Algorithms & Data Structures');

    // Resume from interrogation (either Choice A or return from Choice B)
    const resumed = await sessionManager.resumeFromInterrogation();
    expect(resumed.isInterrogating).toBe(false);
    expect(resumed.status).toBe('RunningStudy');
    expect(resumed.deadline).not.toBeNull();
    // Resumed deadline must preserve exact remaining time, not reset full timer
    expect(resumed.remainingMs).toBe(paused.remainingMs);
  });

  it('accurately tracks 3-strike violations', async () => {
    const sessionManager = new SessionManager();
    const subjects: PomodoroSubject[] = [
      {
        id: 'p1',
        name: 'Operating Systems',
        url: 'https://example.com/os',
        studyDurationMinutes: 25,
        breakDurationMinutes: 5,
        sessions: 1,
      },
    ];

    await sessionManager.startPomodoro(subjects, 102);
    expect(sessionManager.getState().violationCount).toBe(0);

    const strike1 = await sessionManager.recordViolation();
    expect(strike1.violationCount).toBe(1);
    expect(strike1.shouldTerminate).toBe(false);
    expect(sessionManager.getState().violationCount).toBe(1);

    const strike2 = await sessionManager.recordViolation();
    expect(strike2.violationCount).toBe(2);
    expect(strike2.shouldTerminate).toBe(false);
    expect(sessionManager.getState().violationCount).toBe(2);

    const strike3 = await sessionManager.recordViolation();
    expect(strike3.violationCount).toBe(3);
    expect(strike3.shouldTerminate).toBe(true);
    expect(sessionManager.getState().violationCount).toBe(3);
  });

  it('tracks website browsing time without double-counting and persists visits', async () => {
    await ExtensionStorage.trackWebsiteTime('geeksforgeeks.org', 120);
    await ExtensionStorage.trackWebsiteTime('geeksforgeeks.org', 30);
    await ExtensionStorage.trackWebsiteTime('nptel.ac.in', 90);

    const analytics = await ExtensionStorage.getAnalytics();
    expect(analytics.websiteVisits['geeksforgeeks.org'].totalSeconds).toBe(150);
    expect(analytics.websiteVisits['geeksforgeeks.org'].visitCount).toBe(2);
    expect(analytics.websiteVisits['nptel.ac.in'].totalSeconds).toBe(90);
  });

  it('manages user custom blacklist and integrates with isBlockedUrl', async () => {
    expect(isBlockedUrl('https://my-distraction.com')).toBe(false);

    // Add to custom blacklist
    const updated = await ExtensionStorage.addCustomBlacklistDomain('my-distraction.com');
    expect(updated.customBlacklist).toContain('my-distraction.com');

    // Check blocked URL detection
    expect(isBlockedUrl('https://my-distraction.com/feed', updated.customBlacklist)).toBe(true);
    expect(isBlockedUrl('https://sub.my-distraction.com/page', updated.customBlacklist)).toBe(true);

    // Remove from custom blacklist
    const removed = await ExtensionStorage.removeCustomBlacklistDomain('my-distraction.com');
    expect(removed.customBlacklist).not.toContain('my-distraction.com');
    expect(isBlockedUrl('https://my-distraction.com/feed', removed.customBlacklist)).toBe(false);
  });

  it('records completed session logs and clears history when requested', async () => {
    await ExtensionStorage.recordSessionLog({
      id: 'sess_1',
      mode: 'pomodoro',
      subjectName: 'Computer Networks',
      startedAt: Date.now() - 25 * 60 * 1000,
      endedAt: Date.now(),
      durationMinutes: 25,
      status: 'Completed',
    });

    let analytics = await ExtensionStorage.getAnalytics();
    expect(analytics.completedPomodoroCount).toBe(1);
    expect(analytics.totalSecondsStudied).toBe(25 * 60);
    expect(analytics.sessions).toHaveLength(1);
    expect(analytics.sessions[0].subjectName).toBe('Computer Networks');

    // Clear history
    await ExtensionStorage.clearAnalytics();
    analytics = await ExtensionStorage.getAnalytics();
    expect(analytics.completedPomodoroCount).toBe(0);
    expect(analytics.totalSecondsStudied).toBe(0);
    expect(analytics.sessions).toHaveLength(0);
  });
});
