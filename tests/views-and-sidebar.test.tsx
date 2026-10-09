import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Sidebar } from '../src/components/layout/Sidebar';
import { DistractionBlacklistView } from '../src/components/views/DistractionBlacklistView';
import { LiveMonitorView } from '../src/components/views/LiveMonitorView';
import { PomodoroView } from '../src/components/views/PomodoroView';
import { ScheduledStudyView } from '../src/components/views/ScheduledStudyView';
import { SettingsView } from '../src/components/views/SettingsView';
import { INITIAL_ANALYTICS, INITIAL_SESSION_STATE, SessionState } from '../src/shared/types';

describe('Modular Dashboard & Executive Left Sidebar', () => {
  it('renders Sidebar with all navigation items and triggers view switching', () => {
    const onSelectView = vi.fn();
    const onPause = vi.fn();
    const onResume = vi.fn();

    render(
      <Sidebar
        activeView="scheduled"
        onSelectView={onSelectView}
        session={INITIAL_SESSION_STATE}
        onPause={onPause}
        onResume={onResume}
      />
    );

    expect(screen.getByText('Back to Basics')).toBeInTheDocument();
    expect(screen.getByText('Live Study Monitor')).toBeInTheDocument();
    expect(screen.getByText('Scheduled Study')).toBeInTheDocument();
    expect(screen.getByText('Pomodoro Mode')).toBeInTheDocument();
    expect(screen.getByText('Learning Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Distractions & Blacklist')).toBeInTheDocument();
    expect(screen.getByText('Session History')).toBeInTheDocument();
    expect(screen.getByText('Settings & Audio')).toBeInTheDocument();

    // Click Pomodoro Mode
    const pomoBtn = screen.getByText('Pomodoro Mode');
    fireEvent.click(pomoBtn);
    expect(onSelectView).toHaveBeenCalledWith('pomodoro');
  });

  it('renders ScheduledStudyView with structured rows and columns and starts session', () => {
    const onStart = vi.fn();
    render(
      <ScheduledStudyView
        initialSubjects={[
          {
            id: 's1',
            name: 'Discrete Mathematics',
            url: 'https://example.com/math',
            durationMinutes: 45,
          },
        ]}
        onStart={onStart}
        isSessionActive={false}
      />
    );

    expect(screen.getByDisplayValue('Discrete Mathematics')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://example.com/math')).toBeInTheDocument();
    expect(screen.getByDisplayValue('45')).toBeInTheDocument();

    // Add subject
    const addBtn = screen.getByRole('button', { name: /add subject/i });
    fireEvent.click(addBtn);

    // Verify 2 rows now exist
    expect(screen.getByDisplayValue('Subject 2')).toBeInTheDocument();

    // Start
    const startBtn = screen.getByRole('button', { name: /start scheduled study/i });
    fireEvent.click(startBtn);

    // Should fail validation because row 2 has empty URL
    expect(onStart).not.toHaveBeenCalled();
    expect(screen.getByText(/Row #2: URL is required/i)).toBeInTheDocument();
  });

  it('renders PomodoroView with preset selectors and validates inputs', () => {
    const onStart = vi.fn();
    render(
      <PomodoroView
        initialSubjects={[
          {
            id: 'p1',
            name: 'Computer Networks',
            url: 'https://example.com/networks',
            sessions: 2,
            studyDurationMinutes: 25,
            breakDurationMinutes: 5,
          },
        ]}
        onStart={onStart}
        isSessionActive={false}
      />
    );

    expect(screen.getByDisplayValue('Computer Networks')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://example.com/networks')).toBeInTheDocument();

    // Click 50m preset
    const btn50 = screen.getByRole('button', { name: '50m' });
    fireEvent.click(btn50);

    const startBtn = screen.getByRole('button', { name: /start pomodoro/i });
    fireEvent.click(startBtn);

    expect(onStart).toHaveBeenCalledWith([
      expect.objectContaining({
        name: 'Computer Networks',
        studyDurationMinutes: 50,
        sessions: 2,
      }),
    ]);
  });

  it('renders LiveMonitorView when active and displays reset modal', () => {
    const onPause = vi.fn();
    const onResume = vi.fn();
    const onReset = vi.fn();
    const onSkipBreak = vi.fn();
    const onQuit = vi.fn();

    const activeSession: SessionState = {
      ...INITIAL_SESSION_STATE,
      id: 'active_1',
      mode: 'scheduled',
      status: 'RunningStudy',
      currentSubjectIndex: 0,
      totalIntervalMs: 30 * 60 * 1000,
      remainingMs: 25 * 60 * 1000,
      currentStudyUrl: 'https://youtube.com',
      scheduledQueue: [
        {
          id: 's1',
          name: 'Compiler Design',
          url: 'https://youtube.com',
          durationMinutes: 30,
        },
      ],
    };

    render(
      <LiveMonitorView
        session={activeSession}
        onPause={onPause}
        onResume={onResume}
        onReset={onReset}
        onSkipBreak={onSkipBreak}
        onQuitSession={onQuit}
        onNavigateToScheduled={vi.fn()}
        onNavigateToPomodoro={vi.fn()}
      />
    );

    expect(screen.getByText('Compiler Design')).toBeInTheDocument();
    expect(screen.getByText('25:00')).toBeInTheDocument();

    // Click Reset
    const resetBtn = screen.getByRole('button', { name: /reset/i });
    fireEvent.click(resetBtn);

    // Modal opens
    expect(screen.getByText(/Reset This Study Session\?/i)).toBeInTheDocument();
    const confirmBtn = screen.getByRole('button', { name: /yes, reset & open site/i });
    fireEvent.click(confirmBtn);
    expect(onReset).toHaveBeenCalled();
  });

  it('renders DistractionBlacklistView and manages custom blacklist', () => {
    const onAdd = vi.fn();
    const onRemove = vi.fn();

    render(
      <DistractionBlacklistView
        analytics={{
          ...INITIAL_ANALYTICS,
          customBlacklist: ['reddit.com'],
          websiteVisits: {
            'reddit.com': {
              domain: 'reddit.com',
              totalSeconds: 300,
              visitCount: 3,
              lastVisited: Date.now(),
              isCustomBlocked: true,
            },
          },
        }}
        onAddBlacklist={onAdd}
        onRemoveBlacklist={onRemove}
      />
    );

    expect(screen.getAllByText('reddit.com').length).toBeGreaterThan(0);
    expect(screen.getByText('Blacklisted')).toBeInTheDocument();

    // Click Unblock
    const unblockBtn = screen.getByRole('button', { name: /unblock/i });
    fireEvent.click(unblockBtn);
    expect(onRemove).toHaveBeenCalledWith('reddit.com');
  });

  it('renders SettingsView with sound preview and local storage guarantee', () => {
    const onUpdate = vi.fn();
    render(
      <SettingsView
        settings={{ soundEnabled: true, pauseOnTabSwitch: false }}
        onUpdateSettings={onUpdate}
      />
    );

    expect(screen.getByText(/30-Second Final Ticking Sound/i)).toBeInTheDocument();
    expect(screen.getByText(/100% Local Privacy Architecture/i)).toBeInTheDocument();

    // Test sound button
    const testAudioBtn = screen.getByRole('button', { name: /test sound/i });
    expect(testAudioBtn).toBeInTheDocument();
    fireEvent.click(testAudioBtn);
  });
});
