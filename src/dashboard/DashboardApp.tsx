import React, { useEffect, useState } from 'react';
import { BookOpen, Clock, Sparkles } from 'lucide-react';
import { ActiveSessionView } from '../components/ActiveSessionView';
import { Header } from '../components/Header';
import { PomodoroForm } from '../components/PomodoroForm';
import { ScheduledStudyForm } from '../components/ScheduledStudyForm';
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

export const DashboardApp: React.FC = () => {
  const [session, setSession] = useState<SessionState>(INITIAL_SESSION_STATE);
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [scheduledSubjects, setScheduledSubjects] = useState<ScheduledSubject[]>([]);
  const [pomodoroSubjects, setPomodoroSubjects] = useState<PomodoroSubject[]>([]);
  const [activeTab, setActiveTab] = useState<SessionMode>('scheduled');
  const [isLoading, setIsLoading] = useState(true);

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
      setScheduledSubjects(storedScheduled);
      setPomodoroSubjects(storedPomodoro);
      if (storedSession.mode) {
        setActiveTab(storedSession.mode);
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

  const handleStartScheduled = (subjects: ScheduledSubject[]) => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage<ExtensionMessage, ExtensionResponse<SessionState>>(
        {
          type: 'START_SCHEDULED_STUDY',
          payload: { subjects },
        },
        (res) => {
          if (res?.success && res.data) setSession(res.data);
        }
      );
    }
  };

  const handleStartPomodoro = (subjects: PomodoroSubject[]) => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage<ExtensionMessage, ExtensionResponse<SessionState>>(
        {
          type: 'START_POMODORO',
          payload: { subjects },
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

  const handleStartNew = () => {
    // Reset session back to idle so user can edit form again
    setSession(INITIAL_SESSION_STATE);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-text-primary flex items-center justify-center">
        <div className="text-sm text-text-muted animate-pulse">
          Loading Back to Basics dashboard...
        </div>
      </div>
    );
  }

  const isSessionActive =
    session.status === 'RunningStudy' ||
    session.status === 'PausedStudy' ||
    session.status === 'RunningBreak' ||
    session.status === 'Completed';

  return (
    <div className="min-h-screen bg-background text-text-primary p-6 md:p-10 font-sans selection:bg-primary/20 selection:text-white">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <Header
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          showDashboardLink={false}
        />

        {/* If session is running, show live session card at top */}
        {isSessionActive && (
          <div className="space-y-4">
            <ActiveSessionView
              session={session}
              onPause={handlePause}
              onResume={handleResume}
              onReset={handleReset}
              onSkipBreak={handleSkipBreak}
              onStartNew={handleStartNew}
            />
          </div>
        )}

        {/* Configuration Section */}
        {!isSessionActive && (
          <div className="space-y-6">
            {/* Mode selection tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border pb-4">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Prepare Your Study Schedule
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Set your subjects and intervals in advance. Back to Basics manages the transitions.
                </p>
              </div>

              <div className="flex rounded-lg bg-surface-subtle border border-surface-border p-1 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('scheduled')}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-all ${
                    activeTab === 'scheduled'
                      ? 'bg-surface-elevated text-white shadow-sm'
                      : 'text-text-secondary hover:text-white'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-primary-light" />
                  Scheduled Study
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('pomodoro')}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-all ${
                    activeTab === 'pomodoro'
                      ? 'bg-surface-elevated text-white shadow-sm'
                      : 'text-text-secondary hover:text-white'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 text-accent-emerald" />
                  Pomodoro Mode
                </button>
              </div>
            </div>

            {/* Active Form */}
            {activeTab === 'scheduled' ? (
              <ScheduledStudyForm
                initialSubjects={scheduledSubjects}
                onStart={handleStartScheduled}
              />
            ) : (
              <PomodoroForm
                initialSubjects={pomodoroSubjects}
                onStart={handleStartPomodoro}
              />
            )}

            {/* Philosophy Note */}
            <Card variant="subtle" className="p-5 mt-8 border-dashed border-surface-border/80">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-primary-light shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    Product Philosophy
                  </h4>
                  <p className="text-xs text-text-muted leading-relaxed italic">
                    «Make it easier to start studying, harder to get distracted, and unnecessary to keep making decisions throughout a study session.»
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
