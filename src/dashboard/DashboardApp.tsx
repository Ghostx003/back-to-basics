import React, { useEffect, useState } from 'react';
import { Sidebar, ViewKey } from '../components/layout/Sidebar';
import { DistractionBlacklistView } from '../components/views/DistractionBlacklistView';
import { LiveMonitorView } from '../components/views/LiveMonitorView';
import { PomodoroView } from '../components/views/PomodoroView';
import { ProductivityAnalyticsView } from '../components/views/ProductivityAnalyticsView';
import { ScheduledStudyView } from '../components/views/ScheduledStudyView';
import { SessionHistoryView } from '../components/views/SessionHistoryView';
import { SettingsView } from '../components/views/SettingsView';
import { ExtensionMessage, ExtensionResponse } from '../shared/messages';
import {
  DEFAULT_SETTINGS,
  ExtensionSettings,
  INITIAL_ANALYTICS,
  INITIAL_SESSION_STATE,
  PomodoroSubject,
  ScheduledSubject,
  SessionState,
  StudyAnalytics,
} from '../shared/types';
import { ExtensionStorage } from '../storage/storage';

export const DashboardApp: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewKey>('live-monitor');
  const [session, setSession] = useState<SessionState>(INITIAL_SESSION_STATE);
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [analytics, setAnalytics] = useState<StudyAnalytics>(INITIAL_ANALYTICS);
  const [scheduledSubjects, setScheduledSubjects] = useState<ScheduledSubject[]>([]);
  const [pomodoroSubjects, setPomodoroSubjects] = useState<PomodoroSubject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    const data = await ExtensionStorage.getAnalytics();
    setAnalytics(data);
  };

  useEffect(() => {
    async function loadData() {
      const [storedSession, storedSettings, storedScheduled, storedPomodoro, storedAnalytics] =
        await Promise.all([
          ExtensionStorage.getSessionState(),
          ExtensionStorage.getSettings(),
          ExtensionStorage.getScheduledConfig(),
          ExtensionStorage.getPomodoroConfig(),
          ExtensionStorage.getAnalytics(),
        ]);

      setSession(storedSession);
      setSettings(storedSettings);
      setScheduledSubjects(storedScheduled);
      setPomodoroSubjects(storedPomodoro);
      setAnalytics(storedAnalytics);

      // If a session is already active on load, show live monitor
      if (
        storedSession.status === 'RunningStudy' ||
        storedSession.status === 'PausedStudy' ||
        storedSession.status === 'RunningBreak'
      ) {
        setActiveView('live-monitor');
      } else {
        // Default to scheduled view for easy configuration
        setActiveView('scheduled');
      }

      setIsLoading(false);
    }

    loadData();

    // Listen to background messages
    const messageListener = (msg: ExtensionMessage) => {
      if (msg.type === 'SESSION_STATE_UPDATED') {
        setSession(msg.payload);
        fetchAnalytics();
      }
    };

    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener(messageListener);
      return () => chrome.runtime.onMessage.removeListener(messageListener);
    }
  }, []);

  // Poll analytics periodically to show live tracking duration
  useEffect(() => {
    const timer = setInterval(() => {
      fetchAnalytics();
    }, 4000);
    return () => clearInterval(timer);
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
          if (res?.success && res.data) {
            setSession(res.data);
            setActiveView('live-monitor');
          }
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
          if (res?.success && res.data) {
            setSession(res.data);
            setActiveView('live-monitor');
          }
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
    // Calls background RESET_SESSION which restarts timer AND reopens/focuses designated website!
    chrome.runtime.sendMessage<ExtensionMessage>({ type: 'RESET_SESSION' });
  };

  const handleSkipBreak = () => {
    chrome.runtime.sendMessage<ExtensionMessage>({ type: 'SKIP_BREAK' });
  };

  const handleQuitSession = () => {
    chrome.runtime.sendMessage<ExtensionMessage>({ type: 'QUIT_SESSION' });
  };

  const handleAddBlacklist = (domain: string) => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage<ExtensionMessage, ExtensionResponse<StudyAnalytics>>(
        {
          type: 'ADD_CUSTOM_BLACKLIST',
          payload: { domain },
        },
        (res) => {
          if (res?.success && res.data) setAnalytics(res.data);
        }
      );
    } else {
      ExtensionStorage.addCustomBlacklistDomain(domain).then(setAnalytics);
    }
  };

  const handleRemoveBlacklist = (domain: string) => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage<ExtensionMessage, ExtensionResponse<StudyAnalytics>>(
        {
          type: 'REMOVE_CUSTOM_BLACKLIST',
          payload: { domain },
        },
        (res) => {
          if (res?.success && res.data) setAnalytics(res.data);
        }
      );
    } else {
      ExtensionStorage.removeCustomBlacklistDomain(domain).then(setAnalytics);
    }
  };

  const handleClearHistory = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage<ExtensionMessage, ExtensionResponse<StudyAnalytics>>(
        {
          type: 'CLEAR_HISTORY',
        },
        (res) => {
          if (res?.success && res.data) setAnalytics(res.data);
        }
      );
    } else {
      ExtensionStorage.clearAnalytics().then(() => setAnalytics(INITIAL_ANALYTICS));
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-background text-text-primary flex items-center justify-center">
        <div className="text-xs font-semibold text-text-muted animate-pulse tracking-wider uppercase">
          Initializing Back to Basics Dashboard...
        </div>
      </div>
    );
  }

  const isSessionActive =
    session.status === 'RunningStudy' ||
    session.status === 'PausedStudy' ||
    session.status === 'RunningBreak';

  return (
    <div className="flex h-screen w-screen bg-background text-text-primary font-sans overflow-hidden selection:bg-primary/20 selection:text-white">
      {/* Left Sidebar */}
      <Sidebar
        activeView={activeView}
        onSelectView={setActiveView}
        session={session}
        onPause={handlePause}
        onResume={handleResume}
      />

      {/* Main Dedicated Workspace */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
        {activeView === 'live-monitor' && (
          <LiveMonitorView
            session={session}
            onPause={handlePause}
            onResume={handleResume}
            onReset={handleReset}
            onSkipBreak={handleSkipBreak}
            onQuitSession={handleQuitSession}
            onNavigateToScheduled={() => setActiveView('scheduled')}
            onNavigateToPomodoro={() => setActiveView('pomodoro')}
          />
        )}

        {activeView === 'scheduled' && (
          <ScheduledStudyView
            initialSubjects={scheduledSubjects}
            onStart={handleStartScheduled}
            isSessionActive={isSessionActive}
          />
        )}

        {activeView === 'pomodoro' && (
          <PomodoroView
            initialSubjects={pomodoroSubjects}
            onStart={handleStartPomodoro}
            isSessionActive={isSessionActive}
          />
        )}

        {activeView === 'analytics' && (
          <ProductivityAnalyticsView analytics={analytics} />
        )}

        {activeView === 'blacklist' && (
          <DistractionBlacklistView
            analytics={analytics}
            onAddBlacklist={handleAddBlacklist}
            onRemoveBlacklist={handleRemoveBlacklist}
          />
        )}

        {activeView === 'history' && (
          <SessionHistoryView
            analytics={analytics}
            onClearHistory={handleClearHistory}
          />
        )}

        {activeView === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
          />
        )}
      </main>
    </div>
  );
};
