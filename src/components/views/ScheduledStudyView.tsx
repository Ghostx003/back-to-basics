import React, { useState } from 'react';
import {
  AlertCircle,
  Clock,
  Clipboard,
  Play,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { ScheduledSubject } from '../../shared/types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface ScheduledStudyViewProps {
  initialSubjects: ScheduledSubject[];
  onStart: (subjects: ScheduledSubject[]) => void;
  isSessionActive: boolean;
}

export const ScheduledStudyView: React.FC<ScheduledStudyViewProps> = ({
  initialSubjects,
  onStart,
  isSessionActive,
}) => {
  const [subjects, setSubjects] = useState<ScheduledSubject[]>(() => {
    if (initialSubjects && initialSubjects.length > 0) return initialSubjects;
    return [
      {
        id: 'sched_1',
        name: 'Mathematics',
        url: 'https://youtube.com',
        durationMinutes: 40,
      },
      {
        id: 'sched_2',
        name: 'Operating Systems',
        url: 'https://en.wikipedia.org/wiki/Operating_system',
        durationMinutes: 35,
      },
    ];
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [clipboardNotice, setClipboardNotice] = useState<string | null>(null);

  const handleAddRow = () => {
    const newId = `sched_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setSubjects((prev) => [
      ...prev,
      {
        id: newId,
        name: `Subject ${prev.length + 1}`,
        url: '',
        durationMinutes: 30,
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
    field: keyof ScheduledSubject,
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
          newErrors[s.id] = `Row #${idx + 1}: Must start with http:// or https://`;
        }
      } catch {
        newErrors[s.id] = `Row #${idx + 1}: Invalid URL format.`;
      }

      if (!s.durationMinutes || s.durationMinutes <= 0) {
        newErrors[s.id] = `Row #${idx + 1}: Duration must be at least 1 minute.`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStart = () => {
    if (!validate()) return;
    onStart(subjects);
  };

  const totalMinutes = subjects.reduce((sum, s) => sum + (Number(s.durationMinutes) || 0), 0);
  const finishTime = new Date(Date.now() + totalMinutes * 60000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary-light" />
            Scheduled Study Configuration
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Configure your subject schedule in advance. Back to Basics manages the tabs and automatic transitions.
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
            className="flex items-center gap-1.5 text-xs shadow-md shadow-primary/20"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Start Scheduled Study
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
                <th className="py-3 px-4 w-56">Subject Name</th>
                <th className="py-3 px-4 min-w-[260px]">Study URL</th>
                <th className="py-3 px-4 w-36">Duration</th>
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

                    {/* Study URL with 1-click Paste */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="url"
                          value={subj.url}
                          onChange={(e) => handleUpdate(subj.id, 'url', e.target.value)}
                          placeholder="https://example.com/lecture"
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

                    {/* Duration Input */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={1}
                          max={300}
                          value={subj.durationMinutes}
                          onChange={(e) =>
                            handleUpdate(
                              subj.id,
                              'durationMinutes',
                              Math.max(1, parseInt(e.target.value) || 1)
                            )
                          }
                          className="w-16 bg-surface-subtle border border-surface-border rounded-md px-2 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-primary text-center"
                        />
                        <span className="text-text-muted text-[11px]">mins</span>
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

        {/* Schedule Summary Footer */}
        <div className="bg-surface-subtle/50 border-t border-surface-border px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="text-text-secondary flex items-center gap-2">
            <span>
              Total: <strong className="text-white">{subjects.length} subjects</strong>
            </span>
            <span>•</span>
            <span>
              Duration: <strong className="text-primary-light font-mono">{totalMinutes} minutes</strong>
            </span>
            <span>•</span>
            <span>
              Estimated Completion: <strong className="text-white font-mono">{finishTime}</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={handleAddRow}
            className="text-primary-light hover:text-white font-medium flex items-center gap-1 self-start sm:self-auto transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add another row
          </button>
        </div>
      </Card>

      {/* Philosophy Callout */}
      <Card variant="subtle" className="p-4 border-dashed border-surface-border/70 flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-primary-light shrink-0 mt-0.5" />
        <p className="text-xs text-text-muted italic leading-relaxed">
          «Make it easier to start studying, harder to get distracted, and unnecessary to keep making decisions throughout a study session.»
        </p>
      </Card>
    </div>
  );
};
