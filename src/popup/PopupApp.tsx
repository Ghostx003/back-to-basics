import React, { useEffect, useState } from 'react';
import { ActiveSessionView } from '../components/ActiveSessionView';
import { Header } from '../components/Header';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ExtensionMessage, ExtensionResponse } from '../shared/messages';
import {
  DEFAULT_SETTINGS,
  ExtensionSettings,
  INITIAL_SESSION_STATE,
  PomodoroSubject,
  ScheduledSubject,
  SessionMode,
  SessionState,
} from '../shared/types';
import { ExtensionStorage } from '../storage/storage';

export const PopupApp: React.FC = () => {
  const [session, setSession] = useState<SessionState>(INITIAL_SESSION_STATE);
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [scheduledConfig, setScheduledConfig] = useState<ScheduledSubject[]>([]);
  const [pomodoroConfig, setPomodoroConfig] = useState<PomodoroSubject[]>([]);
  const [modeTab, setModeTab] = useState<SessionMode>('scheduled');
  const [isLoading, setIsLoading] = useState(true);

  // Sync state on load and listen for updates
  useEffect(() => {
    async function loadData() {
      const [storedSession, storedSettings, storedScheduled, storedPomodoro] =
        await Promise.all([
          ExtensionStorage.getSessionState(),
          ExtensionStorage.getSettings(),
          ExtensionStorage.getScheduledConfig(),
          ExtensionStorage.getPomodoroConfig(),
        ]);

      setSession(storedSession);
      setSettings(storedSettings);
      setScheduledConfig(storedScheduled);
      setPomodoroConfig(storedPomodoro);
      if (storedSession.mode) {
        setModeTab(storedSession.mode);
      }
      setIsLoading(false);
    }

    loadData();

    const messageListener = (msg: ExtensionMessage) => {
      if (msg.type === 'SESSION_STATE_UPDATED') {
        setSession(msg.payload);
      }
    };

    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener(messageListener);
      return () => chrome.runtime.onMessage.removeListener(messageListener);
    }
  }, []);

  const handleUpdateSettings = async (patch: Partial<ExtensionSettings>) => {
    const updated = { ...settings, ...patch };
    setSettings(updated);
    await ExtensionStorage.saveSettings(updated);
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage<ExtensionMessage>({
        type: 'UPDATE_SETTINGS',
        payload: patch,
      });
    }
  };

  const handleStartScheduled = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage<ExtensionMessage, ExtensionResponse<SessionState>>(
        {
          type: 'START_SCHEDULED_STUDY',
          payload: { subjects: scheduledConfig },
        },
        (res) => {
          if (res?.success && res.data) setSession(res.data);
        }
      );
    }
  };

  const handleStartPomodoro = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage<ExtensionMessage, ExtensionResponse<SessionState>>(
        {
          type: 'START_POMODORO',
          payload: { subjects: pomodoroConfig },
        },
        (res) => {
          if (res?.success && res.data) setSession(res.data);
        }
      );
    }
  };

  const handlePause = () => {
    chrome.runtime.sendMessage<ExtensionMessage>({ type: 'PAUSE_SESSION' });
  };

  const handleResume = () => {
    chrome.runtime.sendMessage<ExtensionMessage>({ type: 'RESUME_SESSION' });
  };

  const handleReset = () => {
    chrome.runtime.sendMessage<ExtensionMessage>({ type: 'RESET_SESSION' });
  };

  const handleSkipBreak = () => {
    chrome.runtime.sendMessage<ExtensionMessage>({ type: 'SKIP_BREAK' });
  };

  const handleOpenDashboard = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
    }
  };

  if (isLoading) {
    return (
      <div className="w-[380px] min-h-[300px] bg-background text-text-primary p-6 flex items-center justify-center">
        <div className="text-xs text-text-muted animate-pulse">Loading study session...</div>
      </div>
    );
  }

  const isSessionActive =
    session.status === 'RunningStudy' ||
    session.status === 'PausedStudy' ||
    session.status === 'RunningBreak' ||
    session.status === 'Completed';

  return (
    <div className="w-[380px] max-h-[600px] overflow-y-auto bg-background text-text-primary p-5 font-sans select-none">
      <Header
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        showDashboardLink={true}
      />

      {isSessionActive ? (
        <ActiveSessionView
          session={session}
          onPause={handlePause}
          onResume={handleResume}
          onReset={handleReset}
          onSkipBreak={handleSkipBreak}
          onStartNew={handleOpenDashboard}
        />
      ) : (
        <div className="space-y-4">
          {/* Mode Switcher */}
          <div className="flex rounded-lg bg-surface-subtle border border-surface-border p-1">
            <button
              type="button"
              onClick={() => setModeTab('scheduled')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                modeTab === 'scheduled'
                  ? 'bg-surface-elevated text-white shadow-sm'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              Scheduled Study
            </button>
            <button
              type="button"
              onClick={() => setModeTab('pomodoro')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                modeTab === 'pomodoro'
                  ? 'bg-surface-elevated text-white shadow-sm'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              Pomodoro
            </button>
          </div>

          {/* Quick Start Preview */}
          <Card variant="subtle" className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Configured Queue
              </span>
              <span className="text-xs text-primary-light font-medium">
                {modeTab === 'scheduled'
                  ? `${scheduledConfig.length} lessons`
                  : `${pomodoroConfig.length} routines`}
              </span>
            </div>

            <div className="space-y-1.5">
              {(modeTab === 'scheduled' ? scheduledConfig : pomodoroConfig)
                .slice(0, 3)
                .map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-xs py-1 text-text-secondary"
                  >
                    <span className="truncate max-w-[200px]">
                      {idx + 1}. {item.name || `Subject ${idx + 1}`}
                    </span>
                    <span className="text-text-muted text-[11px]">
                      {modeTab === 'scheduled'
                        ? `${(item as any).durationMinutes}m`
                        : `${(item as any).sessions} × ${(item as any).studyDurationMinutes}m`}
                    </span>
                  </div>
                ))}
              {(modeTab === 'scheduled' ? scheduledConfig : pomodoroConfig).length > 3 && (
                <div className="text-[11px] text-text-muted italic pt-1">
                  +{' '}
                  {(modeTab === 'scheduled' ? scheduledConfig : pomodoroConfig).length - 3}{' '}
                  more in queue
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={modeTab === 'scheduled' ? handleStartScheduled : handleStartPomodoro}
              >
                Start studying
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={handleOpenDashboard}
              >
                Edit schedule in dashboard
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
