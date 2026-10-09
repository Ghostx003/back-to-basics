import React, { useState } from 'react';
import { Clipboard, Plus, Trash2 } from 'lucide-react';
import { PomodoroSubject } from '../shared/types';
import {
  getSubjectDisplayName,
  validateAndSanitizeUrl,
  validateDuration,
  validateSessionCount,
} from '../shared/validation';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';

interface PomodoroFormProps {
  initialSubjects: PomodoroSubject[];
  onStart: (subjects: PomodoroSubject[]) => void;
  disabled?: boolean;
}

export const PomodoroForm: React.FC<PomodoroFormProps> = ({
  initialSubjects,
  onStart,
  disabled = false,
}) => {
  const [subjects, setSubjects] = useState<PomodoroSubject[]>(
    initialSubjects.length > 0
      ? initialSubjects
      : [
          {
            id: 'p_' + Date.now(),
            name: '',
            url: '',
            sessions: 3,
            studyDurationMinutes: 25,
            breakDurationMinutes: 5,
          },
        ]
  );

  const [errors, setErrors] = useState<
    Record<string, { url?: string; sessions?: string; breakDuration?: string; studyDuration?: string }>
  >({});
  const [clipboardNotice, setClipboardNotice] = useState<string | null>(null);

  const handleAddRow = () => {
    const newSubject: PomodoroSubject = {
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      name: '',
      url: '',
      sessions: 3,
      studyDurationMinutes: 25,
      breakDurationMinutes: 5,
    };
    setSubjects([...subjects, newSubject]);
  };

  const handleRemoveRow = (index: number) => {
    if (subjects.length <= 1) return;
    setSubjects(subjects.filter((_, i) => i !== index));
  };

  const handleChange = (
    index: number,
    field: keyof PomodoroSubject,
    value: any
  ) => {
    const updated = [...subjects];
    updated[index] = { ...updated[index], [field]: value };
    setSubjects(updated);

    if (errors[updated[index].id]) {
      setErrors({
        ...errors,
        [updated[index].id]: {
          ...errors[updated[index].id],
          [field]: undefined,
        },
      });
    }
  };

  const handlePasteUrl = async (index: number) => {
    setClipboardNotice(null);
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        setClipboardNotice('Clipboard access not supported. Please paste manually.');
        return;
      }
      const text = await navigator.clipboard.readText();
      handleChange(index, 'url', text.trim());
    } catch {
      setClipboardNotice('Clipboard permission was not granted. Please paste manually.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setClipboardNotice(null);

    const newErrors: Record<
      string,
      { url?: string; sessions?: string; breakDuration?: string; studyDuration?: string }
    > = {};
    let hasError = false;

    const validated: PomodoroSubject[] = subjects.map((sub, idx) => {
      const urlCheck = validateAndSanitizeUrl(sub.url);
      const sessionCheck = validateSessionCount(Number(sub.sessions));
      const studyCheck = validateDuration(Number(sub.studyDurationMinutes));
      const breakCheck = validateDuration(Number(sub.breakDurationMinutes));

      const rowErr: { url?: string; sessions?: string; breakDuration?: string; studyDuration?: string } = {};

      if (!urlCheck.isValid) {
        rowErr.url = urlCheck.errorMessage;
        hasError = true;
      }
      if (!sessionCheck.isValid) {
        rowErr.sessions = sessionCheck.error;
        hasError = true;
      }
      if (!studyCheck.isValid) {
        rowErr.studyDuration = studyCheck.error;
        hasError = true;
      }
      if (!breakCheck.isValid) {
        rowErr.breakDuration = breakCheck.error;
        hasError = true;
      }

      if (Object.keys(rowErr).length > 0) {
        newErrors[sub.id] = rowErr;
      }

      return {
        ...sub,
        name: getSubjectDisplayName(sub.name, idx),
        url: urlCheck.sanitizedUrl || sub.url,
        sessions: Number(sub.sessions),
        studyDurationMinutes: Number(sub.studyDurationMinutes),
        breakDurationMinutes: Number(sub.breakDurationMinutes),
      };
    });

    setErrors(newErrors);

    if (!hasError && validated.length > 0) {
      onStart(validated);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {clipboardNotice && (
        <div className="p-3 bg-accent-amber/10 border border-accent-amber/20 rounded-lg text-xs text-accent-amber flex items-center justify-between">
          <span>{clipboardNotice}</span>
          <button
            type="button"
            onClick={() => setClipboardNotice(null)}
            className="text-text-muted hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      <div className="space-y-3">
        {subjects.map((sub, index) => {
          const rowError = errors[sub.id] || {};
          return (
            <Card
              key={sub.id}
              variant="subtle"
              className="p-4 relative transition-all group hover:border-surface-border"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Pomodoro Routine #{index + 1}
                </span>
                {subjects.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveRow(index)}
                    disabled={disabled}
                    className="text-text-muted hover:text-accent-rose hover:bg-accent-rose/10 -mr-2 -mt-1 h-7 px-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                  <div className="md:col-span-5">
                    <Input
                      label="Subject (Optional)"
                      placeholder={`e.g. ${getSubjectDisplayName('', index)}`}
                      value={sub.name}
                      onChange={(e) => handleChange(index, 'name', e.target.value)}
                      disabled={disabled}
                    />
                  </div>

                  <div className="md:col-span-7">
                    <Input
                      label="Course or Lecture URL"
                      placeholder="https://example.com/playlist"
                      value={sub.url}
                      error={rowError.url}
                      onChange={(e) => handleChange(index, 'url', e.target.value)}
                      disabled={disabled}
                      rightElement={
                        <button
                          type="button"
                          title="Paste URL from clipboard"
                          onClick={() => handlePasteUrl(index)}
                          disabled={disabled}
                          className="p-1 text-text-muted hover:text-primary transition-colors"
                        >
                          <Clipboard className="w-4 h-4" />
                        </button>
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end pt-1">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      Study Interval
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleChange(index, 'studyDurationMinutes', 25)}
                        disabled={disabled}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                          sub.studyDurationMinutes === 25
                            ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20'
                            : 'bg-surface-subtle text-text-secondary border-surface-border hover:bg-surface-elevated'
                        }`}
                      >
                        25 min
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChange(index, 'studyDurationMinutes', 50)}
                        disabled={disabled}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                          sub.studyDurationMinutes === 50
                            ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20'
                            : 'bg-surface-subtle text-text-secondary border-surface-border hover:bg-surface-elevated'
                        }`}
                      >
                        50 min
                      </button>
                    </div>
                  </div>

                  <div>
                    <Input
                      label="Break Duration (min)"
                      type="number"
                      min={1}
                      max={60}
                      value={sub.breakDurationMinutes || ''}
                      error={rowError.breakDuration}
                      onChange={(e) =>
                        handleChange(index, 'breakDurationMinutes', parseInt(e.target.value) || 0)
                      }
                      disabled={disabled}
                    />
                  </div>

                  <div>
                    <Input
                      label="Number of Sessions"
                      type="number"
                      min={1}
                      max={20}
                      value={sub.sessions || ''}
                      error={rowError.sessions}
                      onChange={(e) =>
                        handleChange(index, 'sessions', parseInt(e.target.value) || 1)
                      }
                      disabled={disabled}
                    />
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={handleAddRow}
          disabled={disabled}
        >
          Add subject
        </Button>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={disabled}
          className="shadow-md shadow-primary/20 px-8"
        >
          Start Pomodoro
        </Button>
      </div>
    </form>
  );
};
