import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  Ban,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  Globe,
  History,
  Lock,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { getDaysToGateCSE, StudyAnalytics } from '../shared/types';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface ProductivityDashboardProps {
  analytics: StudyAnalytics;
  onAddBlacklist: (domain: string) => void;
  onRemoveBlacklist: (domain: string) => void;
  onClearHistory: () => void;
}

type SortField = 'domain' | 'totalSeconds' | 'visitCount';
type SortOrder = 'asc' | 'desc';

export const ProductivityDashboard: React.FC<ProductivityDashboardProps> = ({
  analytics,
  onAddBlacklist,
  onRemoveBlacklist,
  onClearHistory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('totalSeconds');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const daysToGate = getDaysToGateCSE();

  // Metrics calculation
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

  // Format timestamp into localized date & time
  const formatDateTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      day: 'numeric',
    });
  };

  // Convert website visits map to array for sorting & filtering
  const visitsList = Object.values(analytics.websiteVisits).filter((v) =>
    v.domain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort visits
  visitsList.sort((a, b) => {
    let comparison = 0;
    if (sortField === 'domain') {
      comparison = a.domain.localeCompare(b.domain);
    } else if (sortField === 'totalSeconds') {
      comparison = a.totalSeconds - b.totalSeconds;
    } else if (sortField === 'visitCount') {
      comparison = a.visitCount - b.visitCount;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Study Hours */}
        <Card variant="elevated" className="p-5 border-l-4 border-l-primary flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Total Study Time
            </span>
            <div className="text-2xl font-black text-white mt-1">
              {totalHours} <span className="text-sm font-medium text-text-muted">hrs</span>
            </div>
            <div className="text-xs text-text-muted mt-1">
              Today: <span className="text-primary-light font-semibold">{todayMinutes}m</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary-light">
            <Clock className="w-6 h-6" />
          </div>
        </Card>

        {/* Completed Pomodoro Sessions */}
        <Card variant="elevated" className="p-5 border-l-4 border-l-accent-emerald flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Pomodoro Sessions
            </span>
            <div className="text-2xl font-black text-white mt-1">
              {completedPomodoros}
            </div>
            <div className="text-xs text-text-muted mt-1">
              Intervals completed
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-accent-emerald/10 border border-accent-emerald/20 flex items-center justify-center text-accent-emerald">
            <Flame className="w-6 h-6" />
          </div>
        </Card>

        {/* Subjects Studied */}
        <Card variant="elevated" className="p-5 border-l-4 border-l-purple-500 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Subjects Studied
            </span>
            <div className="text-2xl font-black text-white mt-1">
              {uniqueSubjects.length}
            </div>
            <div className="text-xs text-text-muted mt-1 truncate max-w-[140px]">
              {uniqueSubjects.length > 0 ? uniqueSubjects.join(', ') : 'None yet'}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </Card>

        {/* GATE CSE 2027 Countdown */}
        <Card variant="elevated" className="p-5 border-l-4 border-l-amber-500 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              GATE CSE 2027
            </span>
            <div className="text-2xl font-black text-amber-400 mt-1">
              {daysToGate} <span className="text-xs font-medium text-amber-300/80">days left</span>
            </div>
            <div className="text-xs text-text-muted mt-1">
              7 February 2027
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Calendar className="w-6 h-6" />
          </div>
        </Card>
      </div>

      {/* Website Visits & Blacklist Manager */}
      <Card variant="elevated" className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary-light" />
              Website Time Tracking & Blacklist
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Accurately tracks active tabs without double-counting. Add distracting sites to your study blacklist.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search domains..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-surface-subtle border border-surface-border text-white placeholder-text-muted focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Informative banner on blacklist enforcement */}
        <div className="bg-surface-subtle/80 border border-surface-border rounded-lg p-3 text-xs text-text-secondary flex items-start gap-2.5">
          <Ban className="w-4 h-4 text-accent-rose shrink-0 mt-0.5" />
          <div>
            <strong className="text-white">Active Enforcement:</strong> Blacklisted sites are immediately closed during study sessions to protect your focus. Navigating to blacklisted sites incurs warning strikes.
          </div>
        </div>

        {/* Website Visits Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-surface-border text-text-secondary font-semibold uppercase tracking-wider">
                <th
                  className="pb-3 cursor-pointer hover:text-white transition-colors"
                  onClick={() => toggleSort('domain')}
                >
                  <div className="flex items-center gap-1.5">
                    Website Domain
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  className="pb-3 cursor-pointer hover:text-white transition-colors"
                  onClick={() => toggleSort('totalSeconds')}
                >
                  <div className="flex items-center gap-1.5">
                    Time Spent
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  className="pb-3 cursor-pointer hover:text-white transition-colors"
                  onClick={() => toggleSort('visitCount')}
                >
                  <div className="flex items-center gap-1.5">
                    Visits
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border/50">
              {visitsList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-text-muted">
                    {searchTerm ? 'No matching domains found' : 'No website activity recorded yet. Start studying to track browsing!'}
                  </td>
                </tr>
              ) : (
                visitsList.map((visit) => {
                  const isBlocked =
                    visit.isCustomBlocked || analytics.customBlacklist.includes(visit.domain.toLowerCase());

                  return (
                    <tr key={visit.domain} className="hover:bg-surface-subtle/40 transition-colors">
                      <td className="py-3 font-mono font-medium text-white flex items-center gap-2">
                        {visit.domain}
                        {isBlocked && (
                          <Badge variant="danger" className="text-[10px] py-0 px-1.5">
                            Blacklisted
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 text-text-secondary font-mono">
                        {formatTime(visit.totalSeconds)}
                      </td>
                      <td className="py-3 text-text-secondary">
                        {visit.visitCount}
                      </td>
                      <td className="py-3 text-right">
                        {isBlocked ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => onRemoveBlacklist(visit.domain)}
                            className="text-[11px] py-1 px-2.5 h-auto border-surface-border hover:border-red-500/50 hover:text-red-400"
                          >
                            Unblock
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => onAddBlacklist(visit.domain)}
                            className="text-[11px] py-1 px-2.5 h-auto flex items-center gap-1 ml-auto"
                          >
                            <Ban className="w-3 h-3" />
                            Add to Blacklist
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Past Study Sessions History */}
      <Card variant="elevated" className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-surface-border pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-purple-400" />
              Session History
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Completed and terminated study intervals recorded locally.
            </p>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowClearConfirm(true)}
            className="text-xs text-text-muted hover:text-red-400 flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear History
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-surface-border text-text-secondary font-semibold uppercase tracking-wider">
                <th className="pb-3">Subject</th>
                <th className="pb-3">Mode</th>
                <th className="pb-3">Duration</th>
                <th className="pb-3">Date & Time</th>
                <th className="pb-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border/50">
              {analytics.sessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-text-muted">
                    No study sessions recorded yet. Finish your first session to see history!
                  </td>
                </tr>
              ) : (
                analytics.sessions.slice(0, 15).map((sess) => (
                  <tr key={sess.id} className="hover:bg-surface-subtle/40 transition-colors">
                    <td className="py-3 font-semibold text-white">
                      {sess.subjectName || 'Study Session'}
                    </td>
                    <td className="py-3 capitalize text-text-secondary">
                      {sess.mode}
                    </td>
                    <td className="py-3 font-mono text-text-secondary">
                      {sess.durationMinutes}m
                    </td>
                    <td className="py-3 text-text-muted">
                      {formatDateTime(sess.startedAt)}
                    </td>
                    <td className="py-3 text-right">
                      {sess.status === 'Completed' ? (
                        <Badge variant="success" className="text-[10px]">
                          Completed
                        </Badge>
                      ) : sess.status === 'Terminated' ? (
                        <Badge variant="danger" className="text-[10px]">
                          Terminated
                        </Badge>
                      ) : (
                        <Badge variant="neutral" className="text-[10px]">
                          {sess.status}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Privacy Guarantee Footer */}
      <Card variant="subtle" className="p-4 border-surface-border/60">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-accent-emerald shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-xs">
            <h4 className="font-semibold text-white flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-accent-emerald" />
              100% Local Privacy Guarantee
            </h4>
            <p className="text-text-muted leading-relaxed">
              All website logs, session statistics, and blocklists are stored entirely in your browser's local storage (<code className="font-mono text-text-secondary">chrome.storage.local</code>). Zero data is sent to external servers or analytics trackers.
            </p>
          </div>
        </div>
      </Card>

      {/* Clear Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card variant="elevated" className="max-w-md w-full p-6 space-y-4 border-red-500/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Clear All Recorded History?</h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  This will reset all study hours, website logs, and session statistics.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowClearConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  onClearHistory();
                  setShowClearConfirm(false);
                }}
              >
                Yes, Clear History
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
