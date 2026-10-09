import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  Ban,
  Globe,
  Plus,
  Search,
  Shield,
} from 'lucide-react';
import { StudyAnalytics } from '../../shared/types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface DistractionBlacklistViewProps {
  analytics: StudyAnalytics;
  onAddBlacklist: (domain: string) => void;
  onRemoveBlacklist: (domain: string) => void;
}

type SortField = 'domain' | 'totalSeconds' | 'visitCount';
type SortOrder = 'asc' | 'desc';

export const DistractionBlacklistView: React.FC<DistractionBlacklistViewProps> = ({
  analytics,
  onAddBlacklist,
  onRemoveBlacklist,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [sortField, setSortField] = useState<SortField>('totalSeconds');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

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

  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (clean) {
      onAddBlacklist(clean);
      setNewDomain('');
    }
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
    <div className="space-y-6 animate-fadeIn max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent-rose" />
            Distraction Tracking & Blacklist Enforcement
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Real-time browsing metrics, 3-strike violation policies, and customized focus domain blacklists.
          </p>
        </div>
      </div>

      {/* 3-Strike Enforcement Policy Banner */}
      <Card variant="elevated" className="p-5 border-l-4 border-l-accent-rose space-y-2 bg-gradient-to-r from-red-950/20 to-surface-elevated">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-accent-rose shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white">
              Aggressive Distraction Enforcement Active
            </h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              Visiting Netflix, Reddit, X.com, adult websites (450+ curated domains), or your custom blacklisted domains during an active study interval results in <strong>immediate tab closure</strong> and increments your strike counter. 3 strikes triggers a 5-second final countdown and terminates the study session.
            </p>
          </div>
        </div>
      </Card>

      {/* Add Custom Blacklist Domain Form */}
      <Card variant="elevated" className="p-5">
        <form onSubmit={handleAddManual} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary block mb-1">
              Add Custom Blacklist Domain
            </label>
            <input
              type="text"
              placeholder="e.g. instagram.com, tiktok.com, twitch.tv"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              className="w-full bg-surface-subtle border border-surface-border rounded-lg px-3 py-2 text-xs text-white placeholder-text-muted focus:outline-none focus:border-red-500 font-mono"
            />
          </div>
          <Button
            type="submit"
            variant="danger"
            size="md"
            disabled={!newDomain.trim()}
            className="self-end text-xs flex items-center gap-1.5 h-9"
          >
            <Plus className="w-3.5 h-3.5" />
            Add to Blacklist
          </Button>
        </form>

        {/* Custom Blacklisted Domains Pill Cloud */}
        {analytics.customBlacklist.length > 0 && (
          <div className="mt-4 pt-4 border-t border-surface-border space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">
              Active User Blacklist ({analytics.customBlacklist.length})
            </span>
            <div className="flex flex-wrap gap-2">
              {analytics.customBlacklist.map((dom) => (
                <span
                  key={dom}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/10 border border-red-500/30 text-red-300 font-mono text-xs"
                >
                  {dom}
                  <button
                    type="button"
                    onClick={() => onRemoveBlacklist(dom)}
                    className="hover:text-white p-0.5 rounded transition-colors"
                    title={`Unblock ${dom}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Website Activity Tracking Table */}
      <Card variant="elevated" className="p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border pb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary-light" />
              Live Website Browsing Telemetry
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Tracks active tabs without double-counting background windows.
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

        {/* Visits Table */}
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
                    Active Time Spent
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
                    {searchTerm
                      ? 'No matching domains found'
                      : 'No website activity recorded yet. Start studying to track browsing!'}
                  </td>
                </tr>
              ) : (
                visitsList.map((visit) => {
                  const isBlocked =
                    visit.isCustomBlocked ||
                    analytics.customBlacklist.includes(visit.domain.toLowerCase());

                  return (
                    <tr
                      key={visit.domain}
                      className="hover:bg-surface-subtle/40 transition-colors"
                    >
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
    </div>
  );
};
