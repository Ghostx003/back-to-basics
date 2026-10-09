import React from 'react';
import { ExternalLink, Volume2, VolumeX } from 'lucide-react';
import { ExtensionSettings } from '../shared/types';

interface HeaderProps {
  settings: ExtensionSettings;
  onUpdateSettings: (settings: Partial<ExtensionSettings>) => void;
  showDashboardLink?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onUpdateSettings,
  showDashboardLink = false,
}) => {
  const handleOpenDashboard = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({
        url: chrome.runtime.getURL('dashboard.html'),
      });
    } else {
      window.open('/dashboard.html', '_blank');
    }
  };

  return (
    <header className="flex items-center justify-between border-b border-surface-border pb-4 mb-5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary-light font-bold text-sm tracking-wider shadow-sm">
          B2B
        </div>
        <div>
          <h1 className="text-base font-bold text-white tracking-tight leading-none">
            Back to Basics
          </h1>
          <p className="text-[11px] text-text-muted mt-0.5 leading-none">
            Structured study & auto transitions
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          title={settings.soundEnabled ? 'Ticking sound: ON' : 'Ticking sound: OFF'}
          onClick={() =>
            onUpdateSettings({ soundEnabled: !settings.soundEnabled })
          }
          className={`p-2 rounded-lg border transition-all ${
            settings.soundEnabled
              ? 'bg-surface-elevated border-surface-border text-primary-light hover:text-white'
              : 'bg-surface-subtle border-surface-border/50 text-text-muted hover:text-text-secondary'
          }`}
        >
          {settings.soundEnabled ? (
            <Volume2 className="w-4 h-4" />
          ) : (
            <VolumeX className="w-4 h-4" />
          )}
        </button>

        {showDashboardLink && (
          <button
            type="button"
            title="Open expanded dashboard"
            onClick={handleOpenDashboard}
            className="p-2 rounded-lg border bg-surface-subtle border-surface-border text-text-secondary hover:text-white hover:bg-surface-elevated transition-all"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
