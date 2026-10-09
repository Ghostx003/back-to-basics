import React from 'react';
import {
  Activity,
  BarChart3,
  BookOpen,
  Calendar,
  Clock,
  History,
  Pause,
  Play,
  Settings,
  Shield,
  Zap,
} from 'lucide-react';
import { getDaysToGateCSE, SessionState } from '../../shared/types';
import { Badge } from '../ui/Badge';

export type ViewKey =
  | 'live-monitor'
  | 'scheduled'
  | 'pomodoro'
  | 'analytics'
  | 'blacklist'
  | 'history'
  | 'settings';

interface SidebarProps {
  activeView: ViewKey;
  onSelectView: (view: ViewKey) => void;
  session: SessionState;
  onPause: () => void;
  onResume: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onSelectView,
  session,
  onPause,
  onResume,
}) => {
  const daysToGate = getDaysToGateCSE();

  const isSessionRunning = session.status === 'RunningStudy' || session.status === 'RunningBreak';
  const isSessionPaused = session.status === 'PausedStudy';
  const isSessionActive = isSessionRunning || isSessionPaused;

  const currentSubject =
    session.mode === 'scheduled'
      ? session.scheduledQueue[session.currentSubjectIndex]?.name || 'Scheduled Subject'
      : session.pomodoroQueue[session.currentSubjectIndex]?.name || 'Pomodoro Subject';

  const formatRemaining = (ms: number) => {
    const totalSecs = Math.max(0, Math.ceil(ms / 1000));
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const navItems: Array<{
    group: string;
    items: Array<{
      id: ViewKey;
      label: string;
      icon: React.ReactNode;
      badge?: string | React.ReactNode;
    }>;
  }> = [
    {
      group: 'LIVE & ACTIVE',
      items: [
        {
          id: 'live-monitor',
          label: 'Live Study Monitor',
          icon: <Activity className="w-4 h-4" />,
          badge: isSessionActive ? (
            <span className="flex h-2 w-2 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${session.status === 'RunningBreak' ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${session.status === 'RunningBreak' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
            </span>
          ) : undefined,
        },
      ],
    },
    {
      group: 'STUDY MODES',
      items: [
        {
          id: 'scheduled',
          label: 'Scheduled Study',
          icon: <Clock className="w-4 h-4" />,
          badge: session.mode === 'scheduled' && isSessionActive ? 'Active' : undefined,
        },
        {
          id: 'pomodoro',
          label: 'Pomodoro Mode',
          icon: <BookOpen className="w-4 h-4" />,
          badge: session.mode === 'pomodoro' && isSessionActive ? 'Active' : undefined,
        },
      ],
    },
    {
      group: 'INSIGHTS & CONTROL',
      items: [
        {
          id: 'analytics',
          label: 'Learning Dashboard',
          icon: <BarChart3 className="w-4 h-4" />,
        },
        {
          id: 'blacklist',
          label: 'Distractions & Blacklist',
          icon: <Shield className="w-4 h-4" />,
        },
        {
          id: 'history',
          label: 'Session History',
          icon: <History className="w-4 h-4" />,
        },
      ],
    },
    {
      group: 'CONFIGURATION',
      items: [
        {
          id: 'settings',
          label: 'Settings & Audio',
          icon: <Settings className="w-4 h-4" />,
        },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-surface border-r border-surface-border flex flex-col h-screen shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white shadow-md shadow-primary/20">
            <Zap className="w-5 h-5 fill-white/20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black tracking-wider text-white uppercase font-sans">
                Back to Basics
              </h1>
              <Badge variant="neutral" className="text-[10px] px-1 py-0 h-4">
                v1.0
              </Badge>
            </div>
            <p className="text-[11px] text-text-muted mt-0.5">
              Production Study Suite
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 overflow-y-auto p-3 space-y-6 custom-scrollbar">
        {navItems.map((group) => (
          <div key={group.group} className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
              {group.group}
            </div>
            {group.items.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectView(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-sm shadow-primary/25 font-semibold'
                      : 'text-text-secondary hover:text-white hover:bg-surface-elevated/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className={isActive ? 'text-white' : 'text-text-muted'}>
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <div>
                      {typeof item.badge === 'string' ? (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-primary/20 text-primary-light'
                        }`}>
                          {item.badge}
                        </span>
                      ) : (
                        item.badge
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Sidebar Footer Widgets */}
      <div className="p-3 border-t border-surface-border space-y-2 bg-surface-subtle/40">
        {/* Active Session Mini Pill */}
        {isSessionActive && (
          <div className="bg-surface-elevated border border-surface-border rounded-lg p-2.5 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted truncate">
                {session.status === 'RunningBreak' ? 'Break Interval' : 'Active Study'}
              </span>
              <span className="font-mono text-xs font-bold text-white">
                {formatRemaining(session.remainingMs || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-white truncate max-w-[140px]">
                {currentSubject}
              </span>
              {isSessionRunning ? (
                <button
                  type="button"
                  onClick={onPause}
                  className="p-1 rounded bg-surface hover:bg-surface-hover text-text-secondary hover:text-white transition-colors"
                  title="Pause Timer"
                >
                  <Pause className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onResume}
                  className="p-1 rounded bg-primary text-white hover:bg-primary-hover transition-colors"
                  title="Resume Timer"
                >
                  <Play className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* GATE CSE 2027 Countdown Widget */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-surface-subtle border border-surface-border/70 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-[11px] text-text-secondary font-medium">GATE CSE 2027</span>
          </div>
          <span className="font-mono text-[11px] font-bold text-amber-400">
            {daysToGate}d left
          </span>
        </div>
      </div>
    </aside>
  );
};
