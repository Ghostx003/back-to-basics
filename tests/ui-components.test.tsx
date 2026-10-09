import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ActiveSessionView } from '../src/components/ActiveSessionView';
import { PomodoroForm } from '../src/components/PomodoroForm';
import { ScheduledStudyForm } from '../src/components/ScheduledStudyForm';
import { INITIAL_SESSION_STATE, SessionState } from '../src/shared/types';

describe('UI Components and Form Interactions', () => {
  it('renders ScheduledStudyForm with initial subject and allows adding rows', () => {
    const onStart = vi.fn();
    render(
      <ScheduledStudyForm
        initialSubjects={[
          {
            id: 's-1',
            name: 'Linear Algebra',
            url: 'https://example.com/algebra',
            durationMinutes: 45,
          },
        ]}
        onStart={onStart}
      />
    );

    expect(screen.getByDisplayValue('Linear Algebra')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://example.com/algebra')).toBeInTheDocument();
    expect(screen.getByDisplayValue('45')).toBeInTheDocument();

    // Click "Add subject"
    const addBtn = screen.getByRole('button', { name: /add subject/i });
    fireEvent.click(addBtn);

    // Should now have 2 rows
    expect(screen.getByText(/Lesson #2/i)).toBeInTheDocument();
  });

  it('validates invalid URL and prevents submission in ScheduledStudyForm', () => {
    const onStart = vi.fn();
    render(
      <ScheduledStudyForm
        initialSubjects={[
          {
            id: 's-1',
            name: 'Test',
            url: 'invalid-scheme://bad-url',
            durationMinutes: 30,
          },
        ]}
        onStart={onStart}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /start studying/i });
    fireEvent.click(submitBtn);

    expect(onStart).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Only HTTP and HTTPS web addresses are supported/i)
    ).toBeInTheDocument();
  });

  it('renders PomodoroForm with 25/50m selectors and validates session count', () => {
    const onStart = vi.fn();
    render(
      <PomodoroForm
        initialSubjects={[
          {
            id: 'p-1',
            name: 'Algorithms',
            url: 'https://example.com/algos',
            sessions: 3,
            studyDurationMinutes: 25,
            breakDurationMinutes: 5,
          },
        ]}
        onStart={onStart}
      />
    );

    expect(screen.getByDisplayValue('Algorithms')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '25 min' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '50 min' })).toBeInTheDocument();

    // Click 50 min
    const btn50 = screen.getByRole('button', { name: '50 min' });
    fireEvent.click(btn50);

    // Submit valid form
    const submitBtn = screen.getByRole('button', { name: /start pomodoro/i });
    fireEvent.click(submitBtn);

    expect(onStart).toHaveBeenCalledWith([
      expect.objectContaining({
        studyDurationMinutes: 50,
        sessions: 3,
        breakDurationMinutes: 5,
      }),
    ]);
  });

  it('renders ActiveSessionView with Pause and Reset controls and triggers reset modal', () => {
    const onPause = vi.fn();
    const onResume = vi.fn();
    const onReset = vi.fn();
    const onSkipBreak = vi.fn();
    const onStartNew = vi.fn();

    const activeState: SessionState = {
      ...INITIAL_SESSION_STATE,
      id: 'test-session',
      mode: 'scheduled',
      status: 'RunningStudy',
      scheduledQueue: [
        {
          id: 's-1',
          name: 'Operating Systems',
          url: 'https://example.com/os',
          durationMinutes: 40,
        },
      ],
      currentSubjectIndex: 0,
      totalIntervalMs: 40 * 60 * 1000,
      remainingMs: 30 * 60 * 1000,
      deadline: Date.now() + 30 * 60 * 1000,
    };

    render(
      <ActiveSessionView
        session={activeState}
        onPause={onPause}
        onResume={onResume}
        onReset={onReset}
        onSkipBreak={onSkipBreak}
        onStartNew={onStartNew}
      />
    );

    // Pause button click
    const pauseBtn = screen.getByRole('button', { name: /pause/i });
    fireEvent.click(pauseBtn);
    expect(onPause).toHaveBeenCalled();

    // Reset button click opens confirmation modal
    const resetBtn = screen.getByRole('button', { name: /reset session/i });
    fireEvent.click(resetBtn);

    // Modal should be visible
    expect(screen.getByText('Reset this session?')).toBeInTheDocument();
    expect(
      screen.getByText(/The current timer will restart from the beginning/i)
    ).toBeInTheDocument();

    // Confirm reset
    const confirmResetBtn = screen.getByRole('button', { name: /reset timer/i });
    fireEvent.click(confirmResetBtn);
    expect(onReset).toHaveBeenCalled();
  });
});
