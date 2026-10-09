import React from 'react';
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  GraduationCap,
  TrendingUp,
} from 'lucide-react';
import { getDaysToGateCSE, StudyAnalytics } from '../../shared/types';
import { Card } from '../ui/Card';

interface ProductivityAnalyticsViewProps {
  analytics: StudyAnalytics;
}

export const ProductivityAnalyticsView: React.FC<ProductivityAnalyticsViewProps> = ({
  analytics,
}) => {
  const daysToGate = getDaysToGateCSE();

  const totalHours = (analytics.totalSecondsStudied / 3600).toFixed(1);
  const completedPomodoros = analytics.completedPomodoroCount;

  // Unique subjects count
  const uniqueSubjects = Array.from(
    new Set(analytics.sessions.map((s) => s.subjectName).filter(Boolean))
  );

  // Today's study duration
  const todayKey = new Date().toISOString().split('T')[0];
  const todaySeconds = analytics.dailyStudySeconds[todayKey] || 0;
  const todayMinutes = Math.round(todaySeconds / 60);

  // Format seconds into readable string
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  };

  // Generate last 7 days data for the daily chart
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString([], { weekday: 'short' });
    const secs = analytics.dailyStudySeconds[key] || 0;
    const mins = Math.round(secs / 60);
    return { key, dayLabel, mins, secs };
  });

  const maxDailyMinutes = Math.max(60, ...last7Days.map((d) => d.mins));

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            Learning Time & Productivity Analytics
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Quantitative analysis of your focus intervals, subject distribution, and GATE CSE 2027 milestone tracking.
          </p>
        </div>
      </div>

      {/* GATE CSE 2027 Hero Accountability Banner */}
      <Card variant="elevated" className="p-6 bg-gradient-to-r from-amber-950/30 via-surface-elevated to-surface-elevated border-amber-500/30 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">GATE CSE Exam Target</h3>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                  7 Feb 2027
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Targeted Computer Science & Engineering competitive examination milestone.
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <div className="text-3xl font-black font-mono text-amber-400">
              {daysToGate} <span className="text-sm font-semibold text-amber-300/80">days remaining</span>
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">
              Every Pomodoro interval contributes to your score.
            </div>
          </div>
        </div>
      </Card>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Focus Hours */}
        <Card variant="elevated" className="p-5 border-l-4 border-l-primary flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Total Focus Time
            </span>
            <div className="text-2xl font-black text-white mt-1">
              {totalHours} <span className="text-sm font-medium text-text-muted">hrs</span>
            </div>
            <div className="text-xs text-text-muted mt-1">
              {analytics.totalSecondsStudied > 0 ? `${formatTime(analytics.totalSecondsStudied)} logged` : '0h logged'}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary-light">
            <Clock className="w-5 h-5" />
          </div>
        </Card>

        {/* Today's Focus */}
        <Card variant="elevated" className="p-5 border-l-4 border-l-emerald-500 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Today's Focus
            </span>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {todayMinutes} <span className="text-sm font-medium text-emerald-300/70">mins</span>
            </div>
            <div className="text-xs text-text-muted mt-1">
              Active daily study
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </Card>

        {/* Completed Pomodoro Intervals */}
        <Card variant="elevated" className="p-5 border-l-4 border-l-amber-500 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Pomodoros Done
            </span>
            <div className="text-2xl font-black text-white mt-1">
              {completedPomodoros}
            </div>
            <div className="text-xs text-text-muted mt-1">
              Completed intervals
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Flame className="w-5 h-5" />
          </div>
        </Card>

        {/* Subjects Covered */}
        <Card variant="elevated" className="p-5 border-l-4 border-l-purple-500 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Unique Subjects
            </span>
            <div className="text-2xl font-black text-purple-400 mt-1">
              {uniqueSubjects.length}
            </div>
            <div className="text-xs text-text-muted mt-1 truncate max-w-[130px]">
              {uniqueSubjects.length > 0 ? uniqueSubjects.join(', ') : 'None yet'}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* 7-Day Study Distribution Bar Chart */}
      <Card variant="elevated" className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-surface-border pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary-light" />
              7-Day Study Distribution
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Daily minutes studied across the active week.
            </p>
          </div>
          <span className="text-xs font-mono text-text-muted">
            Peak: {maxDailyMinutes}m
          </span>
        </div>

        <div className="pt-4 pb-2">
          <div className="grid grid-cols-7 gap-3 items-end h-40">
            {last7Days.map((d) => {
              const heightPercent = Math.max(6, (d.mins / maxDailyMinutes) * 100);
              const isToday = d.key === todayKey;

              return (
                <div key={d.key} className="flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-[11px] font-mono text-text-muted">
                    {d.mins > 0 ? `${d.mins}m` : '-'}
                  </span>
                  <div className="w-full bg-surface-subtle rounded-md h-full flex items-end p-1">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded transition-all duration-300 ${
                        isToday
                          ? 'bg-gradient-to-t from-primary to-indigo-400 shadow-sm shadow-primary/30'
                          : d.mins > 0
                          ? 'bg-primary/50 hover:bg-primary/70'
                          : 'bg-surface-border/50'
                      }`}
                    />
                  </div>
                  <span
                    className={`text-xs font-semibold uppercase ${
                      isToday ? 'text-primary-light' : 'text-text-muted'
                    }`}
                  >
                    {d.dayLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
};
