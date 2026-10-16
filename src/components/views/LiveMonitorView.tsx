import React, { useEffect, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Flame,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Shield,
  ShieldCheck,
  SkipForward,
  Sparkles,
  Square,
  Trash2,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import {
  ExtensionSettings,
  PomodoroSubject,
  ScheduledSubject,
  SessionState,
  StudyAnalytics,
} from '../../shared/types';
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
  analytics?: StudyAnalytics;
  scheduledSubjects?: ScheduledSubject[];
  pomodoroSubjects?: PomodoroSubject[];
  onStartScheduled?: (subjects: ScheduledSubject[]) => void;
  onStartPomodoro?: (subjects: PomodoroSubject[]) => void;
  settings?: ExtensionSettings;
  onUpdateSettings?: (patch: Partial<ExtensionSettings>) => void;
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
  analytics,
  scheduledSubjects = [],
  pomodoroSubjects = [],
  onStartScheduled,
  onStartPomodoro,
  settings,
  onUpdateSettings,
}) => {
  const [showResetModal, setShowResetModal] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [isZenMode, setIsZenMode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [scratchpad, setScratchpad] = useState<string>(() => {
    try {
      return localStorage.getItem('b2b_study_scratchpad') || '';
    } catch {
      return '';
    }
  });
  const [copiedNotes, setCopiedNotes] = useState(false);

  // Smooth 500ms ticker for live wall-clock telemetry
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Zen Mode ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isZenMode) {
        setIsZenMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZenMode]);

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

  const handleCopyUrl = async () => {
    if (session.currentStudyUrl) {
      try {
        await navigator.clipboard.writeText(session.currentStudyUrl);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      } catch {}
    }
  };

  const handleScratchpadChange = (val: string) => {
    setScratchpad(val);
    try {
      localStorage.setItem('b2b_study_scratchpad', val);
    } catch {}
  };

  const handleCopyNotes = async () => {
    try {
      await navigator.clipboard.writeText(scratchpad);
      setCopiedNotes(true);
      setTimeout(() => setCopiedNotes(false), 2000);
    } catch {}
  };

  const handleClearNotes = () => {
    setScratchpad('');
    try {
      localStorage.removeItem('b2b_study_scratchpad');
    } catch {}
  };

  const playTestChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {}
  };

  // Instant Sprints for quick start
  const handleInstantSprint = (mins: number) => {
    if (onStartScheduled) {
      onStartScheduled([
        {
          id: `sprint_${Date.now()}`,
          name: `Focus Sprint (${mins}m)`,
          url: 'https://google.com',
          durationMinutes: mins,
        },
      ]);
    }
  };

  // Compute total study time today
  const todayKey = new Date().toISOString().split('T')[0];
  const todaySecs = analytics?.dailyStudySeconds?.[todayKey] || analytics?.totalSecondsStudied || 0;
  const todayHours = Math.floor(todaySecs / 3600);
  const todayMins = Math.floor((todaySecs % 3600) / 60);
  const formattedTodayTime =
    todayHours > 0 ? `${todayHours}h ${todayMins}m` : `${todayMins}m`;

  // Compute estimated finish time for active session
  let futureMs = 0;
  if (session.mode === 'scheduled') {
    for (let i = session.currentSubjectIndex + 1; i < session.scheduledQueue.length; i++) {
      futureMs += (session.scheduledQueue[i].durationMinutes || 0) * 60000;
    }
  } else if (session.mode === 'pomodoro' && currentPomodoroSub) {
    const remainingSetsThisSub = Math.max(0, currentPomodoroSub.sessions - session.currentPomodoroSession);
    futureMs += remainingSetsThisSub * (currentPomodoroSub.studyDurationMinutes + currentPomodoroSub.breakDurationMinutes) * 60000;
    for (let i = session.currentSubjectIndex + 1; i < session.pomodoroQueue.length; i++) {
      const p = session.pomodoroQueue[i];
      futureMs += p.sessions * (p.studyDurationMinutes + p.breakDurationMinutes) * 60000;
    }
  }
  const estimatedCompletionTime = new Date(now + liveRemainingMs + futureMs).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // ZEN FULLSCREEN FOCUS MODE OVERLAY
  if (isZenMode && isSessionActive) {
    return (
      <div className="fixed inset-0 z-50 bg-[#07080b] flex flex-col items-center justify-between p-8 backdrop-blur-2xl animate-fadeIn text-white select-none">
        {/* Zen Top Header */}
        <div className="w-full max-w-4xl flex items-center justify-between border-b border-surface-border/40 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${session.status === 'RunningBreak' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              <span className={`relative inline-flex rounded-full h-3 w-3 ${session.status === 'RunningBreak' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary font-mono">
              ZEN FOCUS MODE • {session.status === 'RunningBreak' ? 'REST INTERVAL' : 'STUDY SPRINT'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsZenMode(false)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-subtle border border-surface-border hover:bg-surface-elevated text-xs font-medium text-text-secondary hover:text-white transition-all"
            title="Exit Zen Mode (ESC)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            Exit Zen Mode (ESC)
          </button>
        </div>

        {/* Giant Zen Countdown */}
        <div className="flex flex-col items-center justify-center text-center space-y-6 my-auto">
          <CircularProgress
            remainingMs={liveRemainingMs}
            totalMs={session.totalIntervalMs || 1}
            size={280}
            strokeWidth={14}
            isBreak={session.status === 'RunningBreak'}
            label={session.status === 'RunningBreak' ? 'Rest Period' : 'Deep Focus'}
          />

          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              {currentSubject?.name || 'Designated Study Target'}
            </h1>
            {session.currentStudyUrl && (
              <span className="text-xs font-mono text-primary-light block max-w-lg truncate">
                {session.currentStudyUrl}
              </span>
            )}
          </div>
        </div>

        {/* Zen Control Deck */}
        <div className="w-full max-w-md flex items-center justify-center gap-3 pt-6 border-t border-surface-border/40">
          {session.status === 'RunningStudy' && (
            <Button variant="secondary" size="md" onClick={onPause} className="flex items-center gap-2 text-xs">
              <Pause className="w-4 h-4" /> Pause
            </Button>
          )}
          {session.status === 'PausedStudy' && (
            <Button variant="primary" size="md" onClick={onResume} className="flex items-center gap-2 text-xs">
              <Play className="w-4 h-4" /> Resume
            </Button>
          )}
          {session.status === 'RunningBreak' && (
            <Button variant="secondary" size="md" onClick={onSkipBreak} className="flex items-center gap-2 text-xs text-amber-300 border-amber-500/30">
              <SkipForward className="w-4 h-4" /> Skip Break
            </Button>
          )}
          <Button variant="secondary" size="md" onClick={() => setShowResetModal(true)} className="flex items-center gap-2 text-xs" title="Reset interval">
            <RotateCcw className="w-4 h-4" /> Reset
          </Button>
          <Button variant="danger" size="md" onClick={() => setShowQuitModal(true)} className="flex items-center gap-2 text-xs">
            <Square className="w-3.5 h-3.5 fill-current" /> Quit
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl">
      {/* 1. TOP MISSION CONTROL TELEMETRY BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-surface-border pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary-light animate-pulse" />
              Live Study Monitor
            </h2>
            <Badge
              variant={
                session.status === 'RunningStudy'
                  ? 'primary'
                  : session.status === 'RunningBreak'
                  ? 'warning'
                  : session.status === 'PausedStudy'
                  ? 'neutral'
                  : session.status === 'Completed'
                  ? 'success'
                  : 'neutral'
              }
              className="text-xs px-2.5 py-0.5"
            >
              {session.status === 'RunningStudy'
                ? 'Studying'
                : session.status === 'RunningBreak'
                ? 'Enforced Break'
                : session.status === 'PausedStudy'
                ? 'Paused'
                : session.status === 'Completed'
                ? 'Completed'
                : 'Standby / Ready'}
            </Badge>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            {isSessionActive
              ? `Current mode: ${session.mode === 'pomodoro' ? 'Pomodoro Protocol' : 'Scheduled Study Engine'} • Managed tab is actively tracked.`
              : 'Real-time telemetry, automated lesson transitions, and distraction defense system.'}
          </p>
        </div>

        {/* Global Command Strip & Clock */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Real-time Clock */}
          <div className="px-3 py-1.5 rounded-lg bg-surface-subtle border border-surface-border text-xs font-mono text-text-secondary flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary-light" />
            <span>
              {new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          {/* Sound Toggle */}
          {settings && onUpdateSettings && (
            <button
              type="button"
              onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
              className={`p-2 rounded-lg border text-xs transition-colors flex items-center gap-1 ${
                settings.soundEnabled
                  ? 'bg-surface-subtle border-surface-border text-emerald-400 hover:text-white'
                  : 'bg-surface-subtle/50 border-surface-border text-text-muted hover:text-white'
              }`}
              title={settings.soundEnabled ? 'Final 30s Chime: Enabled (click to mute)' : 'Final 30s Chime: Muted (click to enable)'}
            >
              {settings.soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Audio Chime Test */}
          <button
            type="button"
            onClick={playTestChime}
            className="p-2 rounded-lg bg-surface-subtle border border-surface-border hover:bg-surface-elevated text-text-muted hover:text-amber-400 text-xs transition-colors"
            title="Test alert chime"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>

          {/* Zen Mode Button */}
          {isSessionActive && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsZenMode(true)}
              className="flex items-center gap-1.5 text-xs text-primary-light hover:text-white"
              title="Enter Zen Fullscreen Focus Mode"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Zen Mode
            </Button>
          )}

          {/* Controls when active */}
          {isSessionActive && (
            <>
              {session.status === 'RunningStudy' && (
                <Button variant="secondary" size="sm" onClick={onPause} className="flex items-center gap-1.5 text-xs">
                  <Pause className="w-3.5 h-3.5" /> Pause
                </Button>
              )}
              {session.status === 'PausedStudy' && (
                <Button variant="primary" size="sm" onClick={onResume} className="flex items-center gap-1.5 text-xs">
                  <Play className="w-3.5 h-3.5" /> Resume
                </Button>
              )}
              {session.status === 'RunningBreak' && (
                <Button variant="secondary" size="sm" onClick={onSkipBreak} className="flex items-center gap-1.5 text-xs text-amber-300 border-amber-500/30">
                  <SkipForward className="w-3.5 h-3.5" /> Skip Break
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowResetModal(true)}
                className="flex items-center gap-1.5 text-xs hover:border-amber-500/40"
                title="Reset interval and reopen designated tab"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </Button>
              <Button variant="danger" size="sm" onClick={() => setShowQuitModal(true)} className="flex items-center gap-1.5 text-xs">
                <Square className="w-3 h-3 fill-current" /> Quit
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 2. EXECUTIVE 4-CARD KPI STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card variant="subtle" className="p-3.5 flex items-center justify-between border-surface-border/70">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted block">Today's Focus</span>
            <span className="text-lg font-bold font-mono text-white mt-0.5 block">{formattedTodayTime}</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary-light">
            <Clock className="w-4 h-4" />
          </div>
        </Card>

        <Card variant="subtle" className="p-3.5 flex items-center justify-between border-surface-border/70">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted block">Sets Completed</span>
            <span className="text-lg font-bold font-mono text-emerald-400 mt-0.5 block">
              {analytics?.completedPomodoroCount || 0} <span className="text-xs font-normal text-text-muted">sets</span>
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Flame className="w-4 h-4" />
          </div>
        </Card>

        <Card variant="subtle" className="p-3.5 flex items-center justify-between border-surface-border/70">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted block">Focus Integrity</span>
            <span className="text-lg font-bold font-mono text-white mt-0.5 block">
              {session.violationCount === 0 ? '100%' : `${Math.max(0, 100 - session.violationCount * 33)}%`}
              <span className="text-xs font-normal text-text-muted ml-1">
                ({session.violationCount}/3 strikes)
              </span>
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </Card>

        <Card variant="subtle" className="p-3.5 flex items-center justify-between border-surface-border/70">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted block">Est. Finish</span>
            <span className="text-lg font-bold font-mono text-primary-light mt-0.5 block">
              {isSessionActive ? estimatedCompletionTime : 'Ready'}
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Zap className="w-4 h-4" />
          </div>
        </Card>
      </div>

      {/* 3. HERO ACTIVE COUNTDOWN OR QUICK-LAUNCH DECK */}
      {isSessionActive ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
          {/* Main Dial Card (Col 5) */}
          <Card variant="elevated" className="md:col-span-5 p-6 flex flex-col items-center justify-center text-center space-y-4 border-surface-border bg-gradient-to-b from-surface-elevated/80 to-surface-subtle/80">
            <div className="relative">
              <CircularProgress
                remainingMs={liveRemainingMs}
                totalMs={session.totalIntervalMs || 1}
                size={190}
                strokeWidth={11}
                isBreak={session.status === 'RunningBreak'}
                label={session.status === 'RunningBreak' ? 'Break' : 'Study'}
              />
            </div>

            <div className="w-full flex items-center justify-between pt-2 border-t border-surface-border/50 text-xs text-text-secondary font-mono px-2">
              <span>{calculateProgress().toFixed(0)}% elapsed</span>
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <Shield className="w-3 h-3" /> Shield Active
              </span>
            </div>
          </Card>

          {/* Active Target Details Card (Col 7) */}
          <div className="md:col-span-7 flex flex-col gap-4">
            <Card variant="elevated" className="p-5 flex-1 space-y-4 border-surface-border">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-primary-light" />
                  Active Target Telemetry
                </span>
                {session.mode === 'pomodoro' && (
                  <span className="text-xs font-semibold text-accent-emerald flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    <Flame className="w-3.5 h-3.5" />
                    Round {session.currentPomodoroSession} of {currentPomodoroSub?.sessions || 1}
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {currentSubject?.name || 'Designated Subject'}
                </h3>
                {session.currentStudyUrl && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <a
                      href={session.currentStudyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary-light hover:underline flex items-center gap-1 font-mono break-all truncate max-w-md"
                      title={session.currentStudyUrl}
                    >
                      {session.currentStudyUrl}
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                    <button
                      type="button"
                      onClick={handleCopyUrl}
                      className="p-1 rounded bg-surface hover:bg-surface-elevated text-text-muted hover:text-white transition-colors text-[10px] shrink-0"
                      title="Copy URL"
                    >
                      {copiedUrl ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-surface-border text-xs">
                <div>
                  <span className="text-text-muted block text-[11px]">Managed Tab</span>
                  <span className="font-mono font-semibold text-white">
                    {session.managedTabId ? `#${session.managedTabId}` : 'Attached'}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block text-[11px]">Violation Strikes</span>
                  <span className={`font-mono font-semibold ${session.violationCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {session.violationCount} / 3 Strikes
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block text-[11px]">Guardian Protocol</span>
                  <span className="font-semibold text-white">
                    {session.isInterrogating ? 'Awaiting Input' : 'Active'}
                  </span>
                </div>
              </div>
            </Card>

            {/* Next Up Banner */}
            <Card variant="subtle" className="p-3.5 border-surface-border flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-surface border border-surface-border flex items-center justify-center text-text-secondary">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-text-muted text-[10px] uppercase font-bold block">Next Up In Queue</span>
                  <span className="font-semibold text-white">
                    {nextSubject ? nextSubject.name : 'Session Completion & Final Rest'}
                  </span>
                </div>
              </div>
              {nextSubject && (
                <span className="text-text-muted font-mono text-[11px]">
                  Automatic Transition
                </span>
              )}
            </Card>
          </div>
        </div>
      ) : (
        /* IDLE COMMAND CENTER LAUNCH STATION */
        <div className="space-y-4">
          <Card variant="elevated" className="p-6 border-surface-border space-y-5 bg-gradient-to-r from-surface-elevated/70 via-surface-subtle/80 to-surface-elevated/70">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Executive Study Command Deck • Ready to Launch
                  </h3>
                </div>
                <p className="text-xs text-text-secondary">
                  Select a pre-configured protocol below to initiate automated browser guarding, wall-clock timing, and zero-distraction focus.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button variant="secondary" size="sm" onClick={() => handleInstantSprint(25)} className="text-xs flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" /> Quick 25m Sprint
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleInstantSprint(50)} className="text-xs flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-emerald-400" /> Deep 50m Sprint
                </Button>
              </div>
            </div>

            {/* Launch Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-surface-border">
              {/* Scheduled Study Card */}
              <div className="p-4 rounded-xl bg-surface/60 border border-surface-border hover:border-primary/50 transition-all flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary-light">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Scheduled Study Engine</h4>
                      <span className="text-[11px] text-text-muted">Sequential lesson schedule</span>
                    </div>
                  </div>
                  <Badge variant="primary" className="text-[11px]">
                    {scheduledSubjects.length} {scheduledSubjects.length === 1 ? 'subject' : 'subjects'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-text-secondary text-[11px]">
                    Duration: <strong className="text-white font-mono">{scheduledSubjects.reduce((acc, s) => acc + (s.durationMinutes || 0), 0)}m</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onNavigateToScheduled}
                      className="text-[11px] text-text-muted hover:text-white transition-colors"
                    >
                      Edit Queue
                    </button>
                    {onStartScheduled && scheduledSubjects.length > 0 && scheduledSubjects[0].url && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onStartScheduled(scheduledSubjects)}
                        className="text-xs py-1 px-3 shadow-md shadow-primary/20"
                      >
                        <Play className="w-3 h-3 fill-current mr-1" /> Launch
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Pomodoro Mode Card */}
              <div className="p-4 rounded-xl bg-surface/60 border border-surface-border hover:border-emerald-500/50 transition-all flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Pomodoro Protocol</h4>
                      <span className="text-[11px] text-text-muted">Structured work & enforced rest</span>
                    </div>
                  </div>
                  <Badge variant="success" className="text-[11px]">
                    {pomodoroSubjects.reduce((acc, s) => acc + (s.sessions || 0), 0)} sets
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-text-secondary text-[11px]">
                    Subjects: <strong className="text-white">{pomodoroSubjects.length}</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onNavigateToPomodoro}
                      className="text-[11px] text-text-muted hover:text-white transition-colors"
                    >
                      Edit Routine
                    </button>
                    {onStartPomodoro && pomodoroSubjects.length > 0 && pomodoroSubjects[0].url && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onStartPomodoro(pomodoroSubjects)}
                        className="text-xs py-1 px-3 bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20"
                      >
                        <Play className="w-3 h-3 fill-current mr-1" /> Launch
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 4. MULTI-FEATURE SPLIT: QUEUE STEPPER TIMELINE & LIVE SCRATCHPAD */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* Left: Queue Stepper Timeline (Col 7) */}
        <Card variant="elevated" className="md:col-span-7 p-5 space-y-4 border-surface-border">
          <div className="flex items-center justify-between border-b border-surface-border pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-light" />
              Session Sequence Timeline
            </span>
            <span className="text-[11px] font-mono text-text-muted">
              {isSessionActive
                ? `${session.currentSubjectIndex + 1} of ${session.mode === 'scheduled' ? session.scheduledQueue.length : session.pomodoroQueue.length}`
                : `${scheduledSubjects.length} subjects queued`}
            </span>
          </div>

          <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
            {isSessionActive ? (
              // Active Queue Items
              (session.mode === 'scheduled' ? session.scheduledQueue : session.pomodoroQueue).map((subj, idx) => {
                const isPast = idx < session.currentSubjectIndex;
                const isCurrent = idx === session.currentSubjectIndex;

                return (
                  <div
                    key={subj.id || idx}
                    className={`p-3 rounded-lg border transition-all flex items-center justify-between text-xs ${
                      isCurrent
                        ? 'bg-primary/10 border-primary shadow-sm shadow-primary/20 text-white'
                        : isPast
                        ? 'bg-surface-subtle/40 border-surface-border text-text-muted opacity-60'
                        : 'bg-surface-subtle border-surface-border text-text-secondary'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate max-w-[70%]">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-[11px] font-bold ${
                          isCurrent
                            ? 'bg-primary text-white animate-pulse'
                            : isPast
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-surface text-text-muted'
                        }`}
                      >
                        {isPast ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : idx + 1}
                      </div>
                      <span className={`truncate font-medium ${isCurrent ? 'text-white' : ''}`}>
                        {subj.name ? `#${idx + 1} • ${subj.name}` : `Subject ${idx + 1}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      {isCurrent && (
                        <span className="text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10">
                          Now Active
                        </span>
                      )}
                      <span>
                        {'durationMinutes' in subj
                          ? `${(subj as ScheduledSubject).durationMinutes}m`
                          : `${(subj as PomodoroSubject).sessions} × ${(subj as PomodoroSubject).studyDurationMinutes}m`}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : scheduledSubjects.length > 0 ? (
              // Idle preview of configured scheduled queue
              scheduledSubjects.map((subj, idx) => (
                <div
                  key={subj.id || idx}
                  className="p-3 rounded-lg bg-surface-subtle border border-surface-border flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5 truncate max-w-[70%]">
                    <span className="w-6 h-6 rounded-full bg-surface border border-surface-border flex items-center justify-center font-mono text-[11px] text-text-muted font-bold">
                      {idx + 1}
                    </span>
                    <span className="truncate font-medium text-text-secondary">
                      {subj.name ? `#${idx + 1} • ${subj.name}` : `Subject ${idx + 1}`}
                    </span>
                  </div>
                  <span className="font-mono text-text-muted text-[11px]">
                    {subj.durationMinutes}m
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-xs text-text-muted">
                No subjects currently queued. Use Scheduled Study or Pomodoro Mode to configure.
              </div>
            )}
          </div>
        </Card>

        {/* Right: Live Session Scratchpad ("Focus Parking Lot") (Col 5) */}
        <Card variant="elevated" className="md:col-span-5 p-5 space-y-3 border-surface-border flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-surface-border pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-accent-amber" />
              Focus Scratchpad
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyNotes}
                disabled={!scratchpad}
                className="p-1 rounded bg-surface hover:bg-surface-elevated text-text-muted hover:text-white transition-colors text-[10px] disabled:opacity-30"
                title="Copy notes to clipboard"
              >
                {copiedNotes ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={handleClearNotes}
                disabled={!scratchpad}
                className="p-1 rounded bg-surface hover:bg-surface-elevated text-text-muted hover:text-red-400 transition-colors text-[10px] disabled:opacity-30"
                title="Clear scratchpad"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <textarea
            value={scratchpad}
            onChange={(e) => handleScratchpadChange(e.target.value)}
            placeholder="Jot down quick thoughts, formulas, doubts, or distracting ideas here so you don't break your study focus..."
            className="w-full h-36 bg-surface-subtle border border-surface-border rounded-lg p-3 text-xs text-white placeholder-text-muted resize-none focus:outline-none focus:border-primary transition-all custom-scrollbar font-mono leading-relaxed"
          />

          <span className="text-[10px] text-text-muted block text-right font-mono">
            Auto-saves locally • {scratchpad.length} characters
          </span>
        </Card>
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
