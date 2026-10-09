import React, { useState } from 'react';
import { Clipboard, Plus, Trash2 } from 'lucide-react';
import { ScheduledSubject } from '../shared/types';
import {
  getSubjectDisplayName,
  validateAndSanitizeUrl,
  validateDuration,
} from '../shared/validation';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';

interface ScheduledStudyFormProps {
  initialSubjects: ScheduledSubject[];
  onStart: (subjects: ScheduledSubject[]) => void;
  disabled?: boolean;
}

export const ScheduledStudyForm: React.FC<ScheduledStudyFormProps> = ({
  initialSubjects,
  onStart,
  disabled = false,
}) => {
  const [subjects, setSubjects] = useState<ScheduledSubject[]>(
    initialSubjects.length > 0
      ? initialSubjects
      : [
          {
            id: 's_' + Date.now(),
            name: '',
            url: '',
            durationMinutes: 30,
          },
        ]
  );

  const [errors, setErrors] = useState<Record<string, { url?: string; duration?: string }>>({});
  const [clipboardNotice, setClipboardNotice] = useState<string | null>(null);

  const handleAddRow = () => {
    const newSubject: ScheduledSubject = {
      id: 's_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      name: '',
      url: '',
      durationMinutes: 30,
    };
    setSubjects([...subjects, newSubject]);
  };

  const handleRemoveRow = (index: number) => {
    if (subjects.length <= 1) return;
    const updated = subjects.filter((_, i) => i !== index);
    setSubjects(updated);
  };

  const handleChange = (
    index: number,
    field: keyof ScheduledSubject,
    value: any
  ) => {
    const updated = [...subjects];
    updated[index] = { ...updated[index], [field]: value };
    setSubjects(updated);

    // Clear error for this field
    if (errors[updated[index].id]) {
      setErrors({
        ...errors,
        [updated[index].id]: {
          ...errors[updated[index].id],
          [field === 'url' ? 'url' : 'duration']: undefined,
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
      const trimmed = text.trim();
      handleChange(index, 'url', trimmed);
    } catch {
      setClipboardNotice('Clipboard permission was not granted. Please paste manually.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setClipboardNotice(null);

    const newErrors: Record<string, { url?: string; duration?: string }> = {};
    let hasError = false;

    const validatedSubjects: ScheduledSubject[] = subjects.map((sub, idx) => {
      const urlCheck = validateAndSanitizeUrl(sub.url);
      const durationCheck = validateDuration(Number(sub.durationMinutes));

      const rowError: { url?: string; duration?: string } = {};

      if (!urlCheck.isValid) {
        rowError.url = urlCheck.errorMessage;
        hasError = true;
      }

      if (!durationCheck.isValid) {
        rowError.duration = durationCheck.error;
        hasError = true;
      }

      if (Object.keys(rowError).length > 0) {
        newErrors[sub.id] = rowError;
      }

      return {
        ...sub,
        name: getSubjectDisplayName(sub.name, idx),
        url: urlCheck.sanitizedUrl || sub.url,
        durationMinutes: Number(sub.durationMinutes),
      };
    });

    setErrors(newErrors);

    if (!hasError && validatedSubjects.length > 0) {
      onStart(validatedSubjects);
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
                  Lesson #{index + 1}
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

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                <div className="md:col-span-4">
                  <Input
                    label="Subject (Optional)"
                    placeholder={`e.g. ${getSubjectDisplayName('', index)}`}
                    value={sub.name}
                    onChange={(e) => handleChange(index, 'name', e.target.value)}
                    disabled={disabled}
                  />
                </div>

                <div className="md:col-span-5">
                  <Input
                    label="Website URL"
                    placeholder="https://example.com/lecture"
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

                <div className="md:col-span-3">
                  <Input
                    label="Duration (min)"
                    type="number"
                    min={1}
                    max={360}
                    value={sub.durationMinutes || ''}
                    error={rowError.duration}
                    onChange={(e) =>
                      handleChange(index, 'durationMinutes', parseInt(e.target.value) || 0)
                    }
                    disabled={disabled}
                  />
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
          Start studying
        </Button>
      </div>
    </form>
  );
};
