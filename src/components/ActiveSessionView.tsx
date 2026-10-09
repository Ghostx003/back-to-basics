import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  FastForward,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import { SessionState } from '../shared/types';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { CircularProgress } from './ui/CircularProgress';
import { Modal } from './ui/Modal';

interface ActiveSessionViewProps {
  session: SessionState;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onSkipBreak: () => void;
  onStartNew: () => void;
}

export const ActiveSessionView: React.FC<ActiveSessionViewProps> = ({
  session,
  onPause,
  onResume,
  onReset,
  onSkipBreak,
  onStartNew,
}) => {
  const [showResetModal, setShowResetModal] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Smooth 500ms ticker for active countdown
  useEffect(() => {
    if (session.status === 'RunningStudy' || session.status === 'RunningBreak') {
      const interval = setInterval(() => {
        setNow(Date.now());
      }, 500);
      return () => clearInterval(interval);
    }
  }, [session.status, session.deadline]);

  const isRunning = session.status === 'RunningStudy';
  const isPaused = session.status === 'PausedStudy';
  const isBreak = session.status === 'RunningBreak';
  const isCompleted = session.status === 'Completed';

  // Calculate live remaining ms based on deadline
  let remainingMs = session.remainingMs;
  if ((isRunning || isBreak) && session.deadline) {
    remainingMs = Math.max(0, session.deadline - now);
  }

  // Get current active subject details
  const currentSubject =
    session.mode === 'scheduled'
      ? session.scheduledQueue[session.currentSubjectIndex]
      : session.pomodoroQueue[session.currentSubjectIndex];

  const totalSubjects =
    session.mode === 'scheduled'
      ? session.scheduledQueue.length
      : session.pomodoroQueue.length;

  const currentSubjectName = currentSubject?.name || `Subject ${session.currentSubjectIndex + 1}`;

  // Next transition time formatted
  let transitionTimeDisplay = '';
  if (session.deadline && (isRunning || isBreak)) {
    const deadlineDate = new Date(session.deadline);
    const timeStr = deadlineDate.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
    if (isBreak) {
      transitionTimeDisplay = `Next lesson starts at ${timeStr}`;
    } else if (session.mode === 'pomodoro') {
      transitionTimeDisplay = `Break begins at ${timeStr}`;
    } else {
      transitionTimeDisplay = `Next lesson starts at ${timeStr}`;
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Status Card */}
      <Card variant="elevated" className="relative overflow-hidden p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-surface-border pb-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                {session.mode === 'scheduled' ? 'Scheduled Study' : 'Pomodoro Study'}
              </span>
              <span className="text-text-muted">•</span>
              <span className="text-xs text-text-secondary">
                Lesson {session.currentSubjectIndex + 1} of {totalSubjects}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              {currentSubjectName}
              {currentSubject?.url && (
                <a
                  href={currentSubject.url}
                  target="_blank"
                  rel="noreferrer"
                  title="Open study page"
                  className="text-text-muted hover:text-primary transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </h2>
          </div>

          <div>
            {isRunning && <Badge variant="primary">Studying</Badge>}
            {isPaused && <Badge variant="warning">Paused</Badge>}
            {isBreak && <Badge variant="success">Break Time</Badge>}
            {isCompleted && <Badge variant="success">Completed</Badge>}
          </div>
        </div>

        {/* Timer & Controls */}
        <div className="flex flex-col items-center justify-center my-4">
          <CircularProgress
            remainingMs={remainingMs}
            totalMs={session.totalIntervalMs}
            size={180}
            strokeWidth={9}
            isBreak={isBreak}
            label={isBreak ? 'Break Remaining' : isPaused ? 'Paused' : 'Remaining'}
          />

          {transitionTimeDisplay && !isPaused && (
            <p className="text-xs text-text-secondary mt-4 font-medium animate-fadeIn">
              {transitionTimeDisplay}
            </p>
          )}

          {session.mode === 'pomodoro' && currentSubject && (
            <div className="mt-2 text-xs text-text-muted">
              Session {session.currentPomodoroSession} of{' '}
              {(currentSubject as any).sessions}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6 pt-4 border-t border-surface-border">
          {isRunning && (
            <Button
              variant="secondary"
              size="md"
              icon={<Pause className="w-4 h-4" />}
              onClick={onPause}
            >
              Pause
            </Button>
          )}

          {isPaused && (
            <Button
              variant="primary"
              size="md"
              icon={<Play className="w-4 h-4" />}
              onClick={onResume}
            >
              Resume
            </Button>
          )}

          {isBreak && (
            <Button
              variant="secondary"
              size="md"
              icon={<FastForward className="w-4 h-4" />}
              onClick={onSkipBreak}
            >
              Skip break
            </Button>
          )}

          {!isCompleted && (
            <Button
              variant="ghost"
              size="md"
              icon={<RotateCcw className="w-4 h-4" />}
              onClick={() => setShowResetModal(true)}
              className="text-text-muted hover:text-accent-rose"
            >
              Reset session
            </Button>
          )}

          {isCompleted && (
            <Button
              variant="primary"
              size="md"
              icon={<CheckCircle2 className="w-4 h-4" />}
              onClick={onStartNew}
            >
              Start new session
            </Button>
          )}
        </div>
      </Card>

      {/* Queue List Preview */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted px-1">
          Study Queue
        </h3>
        <div className="space-y-2">
          {(session.mode === 'scheduled'
            ? session.scheduledQueue
            : session.pomodoroQueue
          ).map((item, index) => {
            const isCurrent = index === session.currentSubjectIndex;
            const isPast = index < session.currentSubjectIndex;

            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-lg border text-sm flex items-center justify-between transition-all ${
                  isCurrent
                    ? 'bg-surface-elevated border-primary/40 text-white shadow-sm'
                    : isPast
                    ? 'bg-surface-subtle/50 border-surface-border/50 text-text-muted'
                    : 'bg-surface-subtle border-surface-border text-text-secondary'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                      isCurrent
                        ? 'bg-primary text-white'
                        : isPast
                        ? 'bg-accent-emerald/20 text-accent-emerald'
                        : 'bg-surface-border text-text-muted'
                    }`}
                  >
                    {isPast ? '✓' : index + 1}
                  </span>
                  <span className="font-medium">{item.name || `Subject ${index + 1}`}</span>
                </div>
                <div className="text-xs text-text-muted">
                  {session.mode === 'scheduled'
                    ? `${(item as any).durationMinutes} min`
                    : `${(item as any).sessions} sessions (${(item as any).studyDurationMinutes}m / ${(item as any).breakDurationMinutes}m)`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={showResetModal}
        title="Reset this session?"
        description="The current timer will restart from the beginning. The rest of your study queue will remain intact."
        confirmLabel="Reset timer"
        cancelLabel="Keep studying"
        isDestructive={true}
        onConfirm={() => {
          setShowResetModal(false);
          onReset();
        }}
        onCancel={() => setShowResetModal(false)}
      />
    </div>
  );
};
