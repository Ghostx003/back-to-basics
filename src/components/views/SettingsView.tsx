import React, { useState } from 'react';
import {
  Lock,
  Pause,
  Settings,
  ShieldCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ExtensionSettings } from '../../shared/types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Switch } from '../ui/Switch';

interface SettingsViewProps {
  settings: ExtensionSettings;
  onUpdateSettings: (patch: Partial<ExtensionSettings>) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [isPlayingTestAudio, setIsPlayingTestAudio] = useState(false);

  // Quick Web Audio API sound preview for the 30-second ticking sound
  const handleTestTickingSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.05);

      setIsPlayingTestAudio(true);
      setTimeout(() => setIsPlayingTestAudio(false), 500);
    } catch {}
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-text-secondary" />
            Extension Settings & Audio Controls
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Minimal, predictable preferences for audio cues, tab behavior, and local storage.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Audio Preferences */}
        <Card variant="elevated" className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary-light shrink-0 mt-0.5">
                {settings.soundEnabled ? (
                  <Volume2 className="w-5 h-5" />
                ) : (
                  <VolumeX className="w-5 h-5 text-text-muted" />
                )}
              </div>
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-white">
                  30-Second Final Ticking Sound
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Plays a quiet, clock-like ticking sound during the final 30 seconds of any study interval to smoothly notify you of the approaching break.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleTestTickingSound}
                className="text-xs"
              >
                {isPlayingTestAudio ? 'Playing...' : 'Test Sound'}
              </Button>
              <Switch
                checked={settings.soundEnabled}
                onChange={(checked: boolean) => onUpdateSettings({ soundEnabled: checked })}
              />
            </div>
          </div>
        </Card>

        {/* Tab Switch Policy */}
        <Card variant="elevated" className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-surface-subtle border border-surface-border flex items-center justify-center text-text-secondary shrink-0 mt-0.5">
                <Pause className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-white">
                  Pause Timer When Leaving Study Tab
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  When enabled, switching away from the designated study tab pauses the study countdown. By default, disabled so normal background studying continues.
                </p>
              </div>
            </div>

            <Switch
              checked={settings.pauseOnTabSwitch}
              onChange={(checked: boolean) =>
                onUpdateSettings({ pauseOnTabSwitch: checked })
              }
            />
          </div>
        </Card>

        {/* Local Privacy & Security Guarantee */}
        <Card variant="subtle" className="p-6 border-surface-border space-y-3">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-accent-emerald/10 border border-accent-emerald/20 flex items-center justify-center text-accent-emerald shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-accent-emerald" />
                100% Local Privacy Architecture
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Back to Basics stores all session schedules, timers, website browsing logs, and custom blocklists completely inside your browser's local sandbox (<code className="font-mono text-text-primary">chrome.storage.local</code>).
              </p>
              <ul className="text-xs text-text-muted space-y-1 pt-1.5 list-disc list-inside">
                <li>No user accounts, logins, or authentication tokens required.</li>
                <li>No telemetry, analytics beacons, or remote cloud servers.</li>
                <li>Works 100% offline without any internet connection to the extension.</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
