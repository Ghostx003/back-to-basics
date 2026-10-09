import React, { useState } from 'react';
import {
  History,
  Trash2,
} from 'lucide-react';
import { StudyAnalytics } from '../../shared/types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';

interface SessionHistoryViewProps {
  analytics: StudyAnalytics;
  onClearHistory: () => void;
}

export const SessionHistoryView: React.FC<SessionHistoryViewProps> = ({
  analytics,
  onClearHistory,
}) => {
  const [showClearModal, setShowClearModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'Completed' | 'Terminated'>('all');

  // Format timestamp into localized date & time
  const formatDateTime = (ts: number) => {
    return new Date(ts).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredSessions = analytics.sessions.filter((s) => {
    if (filter === 'all') return true;
    return s.status === filter;
  });

  const handleConfirmClear = () => {
    setShowClearModal(false);
    onClearHistory();
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-purple-400" />
            Study Session History & Audit Log
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Historical logs of your completed focus intervals, break transitions, and strike terminations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-surface-subtle border border-surface-border p-1">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                filter === 'all'
                  ? 'bg-surface-elevated text-white'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              All ({analytics.sessions.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('Completed')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                filter === 'Completed'
                  ? 'bg-surface-elevated text-white'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              Completed
            </button>
            <button
              type="button"
              onClick={() => setFilter('Terminated')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                filter === 'Terminated'
                  ? 'bg-surface-elevated text-white'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              Terminated
            </button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowClearModal(true)}
            disabled={analytics.sessions.length === 0}
            className="text-xs text-text-muted hover:text-red-400 flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Log
          </Button>
        </div>
      </div>

      {/* History Table Card */}
      <Card variant="elevated" className="p-0 overflow-hidden border-surface-border">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-subtle/80 border-b border-surface-border text-text-secondary font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4 w-32">Mode</th>
                <th className="py-3 px-4 w-28">Duration</th>
                <th className="py-3 px-4 min-w-[160px]">Timestamp</th>
                <th className="py-3 px-4 w-28 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border/60">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-text-muted">
                    No study session logs match your criteria. Start studying to record history!
                  </td>
                </tr>
              ) : (
                filteredSessions.map((sess, idx) => (
                  <tr
                    key={sess.id}
                    className="hover:bg-surface-subtle/30 transition-colors"
                  >
                    <td className="py-3 px-4 text-center font-mono text-text-muted">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {sess.subjectName || 'Study Session'}
                    </td>
                    <td className="py-3 px-4 capitalize text-text-secondary">
                      {sess.mode}
                    </td>
                    <td className="py-3 px-4 font-mono text-text-secondary">
                      {sess.durationMinutes}m
                    </td>
                    <td className="py-3 px-4 text-text-muted">
                      {formatDateTime(sess.startedAt)}
                    </td>
                    <td className="py-3 px-4 text-right">
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

      {/* Confirmation Modal */}
      <Modal
        isOpen={showClearModal}
        title="Clear All Session History?"
        description="This action permanently deletes all recorded study sessions, focus hours, and browsing logs. This cannot be undone."
        confirmLabel="Yes, Clear All History"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleConfirmClear}
        onCancel={() => setShowClearModal(false)}
      />
    </div>
  );
};
