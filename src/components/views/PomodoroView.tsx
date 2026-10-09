import React, { useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Clipboard,
  Flame,
  Play,
  Plus,
  Trash2,
} from 'lucide-react';
import { PomodoroSubject } from '../../shared/types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface PomodoroViewProps {
  initialSubjects: PomodoroSubject[];
  onStart: (subjects: PomodoroSubject[]) => void;
  isSessionActive: boolean;
}

export const PomodoroView: React.FC<PomodoroViewProps> = ({
  initialSubjects,
  onStart,
  isSessionActive,
}) => {
  const [subjects, setSubjects] = useState<PomodoroSubject[]>(() => {
    if (initialSubjects && initialSubjects.length > 0) return initialSubjects;
    return [
      {
        id: 'pomo_1',
        name: 'Operating Systems & Architecture',
        url: 'https://youtube.com',
        sessions: 3,
        studyDurationMinutes: 25,
        breakDurationMinutes: 5,
      },
    ];
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [clipboardNotice, setClipboardNotice] = useState<string | null>(null);

  const handleAddRow = () => {
    const newId = `pomo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setSubjects((prev) => [
      ...prev,
      {
        id: newId,
        name: `Pomodoro Subject ${prev.length + 1}`,
        url: '',
        sessions: 2,
        studyDurationMinutes: 25,
        breakDurationMinutes: 5,
      },
    ]);
  };

  const handleRemoveRow = (id: string) => {
    if (subjects.length <= 1) return;
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleUpdate = (
    id: string,
    field: keyof PomodoroSubject,
    value: string | number
  ) => {
    setSubjects((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
    if (errors[id]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handlePasteUrl = async (id: string) => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        setClipboardNotice('Clipboard access is restricted. Please paste manually into the field.');
        setTimeout(() => setClipboardNotice(null), 3000);
        return;
      }
      const text = await navigator.clipboard.readText();
      const trimmed = text.trim();
      if (!trimmed) {
        setClipboardNotice('Clipboard is empty.');
        setTimeout(() => setClipboardNotice(null), 2500);
        return;
      }
      handleUpdate(id, 'url', trimmed);
    } catch {
      setClipboardNotice('Could not access clipboard. Please paste manually.');
      setTimeout(() => setClipboardNotice(null), 3000);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    subjects.forEach((s, idx) => {
      const trimmedUrl = s.url.trim();
      if (!trimmedUrl) {
        newErrors[s.id] = `Row #${idx + 1}: URL is required.`;
        return;
      }
      try {
        const parsed = new URL(trimmedUrl);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          newErrors[s.id] = `Row #${idx + 1}: URL must start with http:// or https://`;
        }
      } catch {
        newErrors[s.id] = `Row #${idx + 1}: Invalid URL format.`;
      }

      if (!s.sessions || s.sessions < 1) {
        newErrors[s.id] = `Row #${idx + 1}: Sessions must be at least 1.`;
      }
      if (!s.studyDurationMinutes || s.studyDurationMinutes < 1) {
        newErrors[s.id] = `Row #${idx + 1}: Study duration must be at least 1 min.`;
      }
      if (!s.breakDurationMinutes || s.breakDurationMinutes < 1) {
        newErrors[s.id] = `Row #${idx + 1}: Break duration must be at least 1 min.`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStart = () => {
    if (!validate()) return;
    onStart(subjects);
  };

  const totalStudyMinutes = subjects.reduce(
    (sum, s) => sum + s.sessions * s.studyDurationMinutes,
    0
  );
  const totalBreakMinutes = subjects.reduce(
    (sum, s) => sum + Math.max(0, s.sessions - 1) * s.breakDurationMinutes,
    0
  );
  const totalSessionsCount = subjects.reduce((sum, s) => sum + s.sessions, 0);

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-accent-emerald" />
            Pomodoro Mode Configuration
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Structured intervals with enforced pitch-black breaks and automatic media pausing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAddRow}
            className="flex items-center gap-1.5 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Subject
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleStart}
            disabled={isSessionActive}
            className="flex items-center gap-1.5 text-xs shadow-md shadow-primary/20 bg-emerald-600 hover:bg-emerald-500"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Start Pomodoro
          </Button>
        </div>
      </div>

      {/* Clipboard Toast */}
      {clipboardNotice && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs px-3.5 py-2 rounded-lg flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{clipboardNotice}</span>
        </div>
      )}

      {/* Global Validation Errors */}
      {Object.keys(errors).length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs p-3 rounded-lg space-y-1">
          {Object.values(errors).map((err, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
              <span>{err}</span>
            </div>
          ))}
        </div>
      )}

      {/* Structured Rows and Columns Card */}
      <Card variant="elevated" className="p-0 overflow-hidden border-surface-border">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-subtle/80 border-b border-surface-border text-text-secondary font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4 w-52">Subject Name</th>
                <th className="py-3 px-4 min-w-[220px]">Target URL</th>
                <th className="py-3 px-4 w-28 text-center">Intervals</th>
                <th className="py-3 px-4 w-44">Study Duration</th>
                <th className="py-3 px-4 w-40">Break Duration</th>
                <th className="py-3 px-4 w-16 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border/60">
              {subjects.map((subj, index) => {
                const hasError = !!errors[subj.id];
                return (
                  <tr
                    key={subj.id}
                    className="hover:bg-surface-subtle/30 transition-colors"
                  >
                    {/* Index */}
                    <td className="py-3 px-4 text-center font-mono text-text-muted font-bold">
                      {index + 1}
                    </td>

                    {/* Subject Name */}
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={subj.name}
                        onChange={(e) => handleUpdate(subj.id, 'name', e.target.value)}
                        placeholder={`Subject ${index + 1}`}
                        className="w-full bg-surface-subtle border border-surface-border rounded-md px-2.5 py-1.5 text-xs text-white placeholder-text-muted focus:outline-none focus:border-primary"
                      />
                    </td>

                    {/* Target URL with 1-click Paste */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="url"
                          value={subj.url}
                          onChange={(e) => handleUpdate(subj.id, 'url', e.target.value)}
                          placeholder="https://example.com"
                          className={`flex-1 bg-surface-subtle border rounded-md px-2.5 py-1.5 text-xs font-mono text-white placeholder-text-muted focus:outline-none ${
                            hasError ? 'border-red-500' : 'border-surface-border focus:border-primary'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => handlePasteUrl(subj.id)}
                          className="px-2 py-1.5 rounded-md bg-surface border border-surface-border hover:bg-surface-elevated text-text-secondary hover:text-white transition-colors text-[11px] flex items-center gap-1 shrink-0 font-medium"
                          title="Paste URL from clipboard"
                        >
                          <Clipboard className="w-3 h-3" />
                          Paste
                        </button>
                      </div>
                    </td>

                    {/* Sessions Count */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={subj.sessions}
                          onChange={(e) =>
                            handleUpdate(
                              subj.id,
                              'sessions',
                              Math.max(1, parseInt(e.target.value) || 1)
                            )
                          }
                          className="w-14 bg-surface-subtle border border-surface-border rounded-md px-2 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-primary text-center"
                        />
                        <span className="text-text-muted text-[11px]">sets</span>
                      </div>
                    </td>

                    {/* Study Duration Selector (25m / 50m / Custom) */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleUpdate(subj.id, 'studyDurationMinutes', 25)}
                          className={`px-2 py-1 rounded text-[11px] font-semibold border ${
                            subj.studyDurationMinutes === 25
                              ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50'
                              : 'bg-surface-subtle text-text-secondary border-surface-border hover:text-white'
                          }`}
                        >
                          25m
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdate(subj.id, 'studyDurationMinutes', 50)}
                          className={`px-2 py-1 rounded text-[11px] font-semibold border ${
                            subj.studyDurationMinutes === 50
                              ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50'
                              : 'bg-surface-subtle text-text-secondary border-surface-border hover:text-white'
                          }`}
                        >
                          50m
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={180}
                          value={subj.studyDurationMinutes}
                          onChange={(e) =>
                            handleUpdate(
                              subj.id,
                              'studyDurationMinutes',
                              Math.max(1, parseInt(e.target.value) || 1)
                            )
                          }
                          className="w-12 bg-surface-subtle border border-surface-border rounded-md px-1.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-primary text-center"
                          title="Custom Study Duration"
                        />
                      </div>
                    </td>

                    {/* Break Duration Selector (5m / Custom) */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleUpdate(subj.id, 'breakDurationMinutes', 5)}
                          className={`px-2 py-1 rounded text-[11px] font-semibold border ${
                            subj.breakDurationMinutes === 5
                              ? 'bg-amber-600/30 text-amber-300 border-amber-500/50'
                              : 'bg-surface-subtle text-text-secondary border-surface-border hover:text-white'
                          }`}
                        >
                          5m
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdate(subj.id, 'breakDurationMinutes', 10)}
                          className={`px-2 py-1 rounded text-[11px] font-semibold border ${
                            subj.breakDurationMinutes === 10
                              ? 'bg-amber-600/30 text-amber-300 border-amber-500/50'
                              : 'bg-surface-subtle text-text-secondary border-surface-border hover:text-white'
                          }`}
                        >
                          10m
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={subj.breakDurationMinutes}
                          onChange={(e) =>
                            handleUpdate(
                              subj.id,
                              'breakDurationMinutes',
                              Math.max(1, parseInt(e.target.value) || 1)
                            )
                          }
                          className="w-12 bg-surface-subtle border border-surface-border rounded-md px-1.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-primary text-center"
                          title="Custom Break Duration"
                        />
                      </div>
                    </td>

                    {/* Remove Action */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(subj.id)}
                        disabled={subjects.length <= 1}
                        className="p-1.5 rounded text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                        title="Remove row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pomodoro Summary Footer */}
        <div className="bg-surface-subtle/50 border-t border-surface-border px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="text-text-secondary flex items-center gap-2">
            <span>
              Total Intervals: <strong className="text-white">{totalSessionsCount} sets</strong>
            </span>
            <span>•</span>
            <span>
              Study Time: <strong className="text-emerald-400 font-mono">{totalStudyMinutes}m</strong>
            </span>
            <span>•</span>
            <span>
              Break Time: <strong className="text-amber-400 font-mono">{totalBreakMinutes}m</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={handleAddRow}
            className="text-accent-emerald hover:text-white font-medium flex items-center gap-1 self-start sm:self-auto transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Pomodoro subject
          </button>
        </div>
      </Card>

      {/* Enforcement Architecture Note */}
      <Card variant="subtle" className="p-4 border-dashed border-surface-border/70 flex items-start gap-3">
        <Flame className="w-4 h-4 text-accent-emerald shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-semibold text-white">
            Enforced Rest Architecture
          </h4>
          <p className="text-xs text-text-muted leading-relaxed">
            When study time expires, a pitch-black overlay protects your rest and pauses active media. The timer is completely wall-clock based and independent of video playback speed.
          </p>
        </div>
      </Card>
    </div>
  );
};
