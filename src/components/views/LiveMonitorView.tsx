import React, { useEffect, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BookOpen,
  Clock,
  ExternalLink,
  Flame,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Square,
  Zap,
} from 'lucide-react';
import { SessionState } from '../../shared/types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { CircularProgress } from '../ui/CircularProgress';
import { Modal } from '../ui/Modal';

interface LiveMonitorViewProps {
  session: SessionState;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onSkipBreak: () => void;
  onQuitSession: () => void;
  onNavigateToScheduled: () => void;
  onNavigateToPomodoro: () => void;
}

export const LiveMonitorView: React.FC<LiveMonitorViewProps> = ({
  session,
  onPause,
  onResume,
  onReset,
  onSkipBreak,
  onQuitSession,
  onNavigateToScheduled,
  onNavigateToPomodoro,
}) => {
  const [showResetModal, setShowResetModal] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
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

  const isSessionActive =
    session.status === 'RunningStudy' ||
    session.status === 'PausedStudy' ||
    session.status === 'RunningBreak' ||
    session.status === 'Completed';

  // Calculate live remaining ms based on deadline
  let liveRemainingMs = session.remainingMs || 0;
  if (
    (session.status === 'RunningStudy' || session.status === 'RunningBreak') &&
    session.deadline
  ) {
    liveRemainingMs = Math.max(0, session.deadline - now);
  }

  // Progress percentage
  const calculateProgress = () => {
    if (!session.totalIntervalMs || session.totalIntervalMs <= 0) return 0;
    const elapsed = session.totalIntervalMs - liveRemainingMs;
    return Math.min(100, Math.max(0, (elapsed / session.totalIntervalMs) * 100));
  };

  const currentSubject =
    session.mode === 'scheduled'
      ? session.scheduledQueue[session.currentSubjectIndex]
      : session.pomodoroQueue[session.currentSubjectIndex];

  const currentPomodoroSub =
    session.mode === 'pomodoro'
      ? session.pomodoroQueue[session.currentSubjectIndex]
      : null;

  const nextSubject =
    session.mode === 'scheduled'
      ? session.scheduledQueue[session.currentSubjectIndex + 1]
      : currentPomodoroSub && session.currentPomodoroSession < currentPomodoroSub.sessions
      ? currentPomodoroSub
      : session.pomodoroQueue[session.currentSubjectIndex + 1];

  const handleConfirmReset = () => {
    setShowResetModal(false);
    onReset();
  };

  const handleConfirmQuit = () => {
    setShowQuitModal(false);
    onQuitSession();
  };

  // IDLE HERO STATE (When no session is running)
  if (!isSessionActive) {
    return (
      <div className="space-y-8 animate-fadeIn max-w-4xl">
        <div className="flex items-center justify-between border-b border-surface-border pb-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Activity className="w-5 h-5 text-primary-light" />
              Live Study Monitor
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Real-time timer telemetry, managed tab state, and automated lesson transitions.
            </p>
          </div>
          <Badge variant="neutral" className="text-xs px-2.5 py-1">
            Status: Idle / Ready
          </Badge>
        </div>

        <Card variant="elevated" className="p-8 text-center space-y-6 border-dashed border-surface-border">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary-light mx-auto">
            <Zap className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold text-white">No Study Session Active</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Configure your study subjects and let Back to Basics automate your study intervals, website navigation, and Pomodoro breaks.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              onClick={onNavigateToScheduled}
              className="w-full sm:w-auto flex items-center gap-2 text-xs"
            >
              <Clock className="w-4 h-4" />
              Configure Scheduled Study
            </Button>
            <Button
              variant="secondary"
              onClick={onNavigateToPomodoro}
              className="w-full sm:w-auto flex items-center gap-2 text-xs"
            >
              <BookOpen className="w-4 h-4 text-accent-emerald" />
              Configure Pomodoro Mode
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ACTIVE SESSION MONITOR VIEW
  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary-light animate-pulse" />
              Live Study Monitor
            </h2>
            <Badge
              variant={
                session.status === 'RunningBreak'
                  ? 'warning'
                  : session.status === 'PausedStudy'
                  ? 'neutral'
                  : session.status === 'Completed'
                  ? 'success'
                  : 'primary'
              }
              className="text-xs"
            >
              {session.status === 'RunningStudy'
                ? 'Studying'
                : session.status === 'RunningBreak'
                ? 'Enforced Break'
                : session.status === 'PausedStudy'
                ? 'Paused'
                : session.status}
            </Badge>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Current mode: <strong className="text-white capitalize">{session.mode} Study</strong> • Managed tab is actively tracked.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2">
          {session.status === 'RunningStudy' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onPause}
              className="flex items-center gap-1.5 text-xs"
            >
              <Pause className="w-3.5 h-3.5" />
              Pause
            </Button>
          )}

          {session.status === 'PausedStudy' && (
            <Button
              variant="primary"
              size="sm"
              onClick={onResume}
              className="flex items-center gap-1.5 text-xs"
            >
              <Play className="w-3.5 h-3.5" />
              Resume
            </Button>
          )}

          {session.status === 'RunningBreak' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onSkipBreak}
              className="flex items-center gap-1.5 text-xs text-amber-300 border-amber-500/30"
            >
              <SkipForward className="w-3.5 h-3.5" />
              Skip Break
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowResetModal(true)}
            className="flex items-center gap-1.5 text-xs hover:border-amber-500/40"
            title="Reset interval and reopen designated tab"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </Button>

          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowQuitModal(true)}
            className="flex items-center gap-1.5 text-xs"
          >
            <Square className="w-3 h-3 fill-current" />
            Quit
          </Button>
        </div>
      </div>

      {/* Main Live Card with Circular Countdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Left Column: Big Circular Countdown */}
        <Card variant="elevated" className="p-6 md:col-span-1 flex flex-col items-center justify-center text-center space-y-4">
          <CircularProgress
            remainingMs={liveRemainingMs}
            totalMs={session.totalIntervalMs || 1}
            size={180}
            strokeWidth={10}
            isBreak={session.status === 'RunningBreak'}
            label={session.status === 'RunningBreak' ? 'Break' : 'Study'}
          />

          <div className="text-xs text-text-secondary font-mono">
            {calculateProgress().toFixed(0)}% elapsed
          </div>
        </Card>

        {/* Right Columns: Telemetry & Active Lesson Information */}
        <div className="md:col-span-2 space-y-4">
          {/* Active Lesson Card */}
          <Card variant="elevated" className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Active Study Target
              </span>
              {session.mode === 'pomodoro' && (
                <span className="text-xs font-semibold text-accent-emerald flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" />
                  Interval {session.currentPomodoroSession} of {currentPomodoroSub?.sessions || 1}
                </span>
              )}
            </div>

            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {currentSubject?.name || 'Designated Subject'}
                </h3>
                {session.currentStudyUrl && (
                  <a
                    href={session.currentStudyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary-light hover:underline flex items-center gap-1 font-mono mt-1 break-all"
                  >
                    {session.currentStudyUrl}
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-surface-border text-xs">
              <div>
                <span className="text-text-muted block text-[11px]">Managed Tab ID</span>
                <span className="font-mono font-semibold text-white">
                  {session.managedTabId ? `#${session.managedTabId}` : 'Attached'}
                </span>
              </div>
              <div>
                <span className="text-text-muted block text-[11px]">Violations</span>
                <span className={`font-mono font-semibold ${session.violationCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {session.violationCount} / 3 Strikes
                </span>
              </div>
              <div>
                <span className="text-text-muted block text-[11px]">Interrogation Status</span>
                <span className="font-semibold text-white">
                  {session.isInterrogating ? 'Awaiting Input' : 'Normal'}
                </span>
              </div>
            </div>
          </Card>

          {/* Next Lesson Preview */}
          <Card variant="subtle" className="p-4 border-surface-border flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-surface border border-surface-border flex items-center justify-center text-text-secondary">
                <ArrowRight className="w-4 h-4" />
              </div>
              <div>
                <span className="text-text-muted text-[11px] block">Up Next</span>
                <span className="font-semibold text-white">
                  {nextSubject ? nextSubject.name : 'Session Completion'}
                </span>
              </div>
            </div>
            {nextSubject && (
              <span className="text-text-secondary font-mono text-[11px]">
                Auto-transitions on zero
              </span>
            )}
          </Card>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={showResetModal}
        title="Reset This Study Session?"
        description="Resetting restarts the current timer from the beginning and automatically re-opens the designated study website. The rest of your study schedule remains intact."
        confirmLabel="Yes, Reset & Open Site"
        cancelLabel="Cancel"
        onConfirm={handleConfirmReset}
        onCancel={() => setShowResetModal(false)}
      />

      {/* Quit Confirmation Modal */}
      <Modal
        isOpen={showQuitModal}
        title="Quit Study Session?"
        description="Are you sure you want to quit the current study session? Your timer will stop and the session will be archived."
        confirmLabel="Yes, Quit Session"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleConfirmQuit}
        onCancel={() => setShowQuitModal(false)}
      />
    </div>
  );
};
