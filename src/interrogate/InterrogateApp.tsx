import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calendar,
  Flame,
  Search,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { ExtensionMessage, ExtensionResponse } from '../shared/messages';
import { getGateCSECountdown, SessionState } from '../shared/types';

export const InterrogateApp: React.FC = () => {
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [view, setView] = useState<'initial' | 'study-search' | 'grill'>('initial');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gateCountdown, setGateCountdown] = useState(getGateCSECountdown());

  useEffect(() => {
    const timer = setInterval(() => {
      setGateCountdown(getGateCSECountdown());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage<ExtensionMessage, ExtensionResponse<SessionState>>(
        { type: 'GET_SESSION_STATE' },
        (res) => {
          if (res?.success && res.data) {
            setSessionState(res.data);
          }
        }
      );
    }
  }, []);

  const subjectName = sessionState
    ? sessionState.mode === 'scheduled'
      ? sessionState.scheduledQueue[sessionState.currentSubjectIndex]?.name || 'Your Study Subject'
      : sessionState.pomodoroQueue[sessionState.currentSubjectIndex]?.name || 'Your Study Subject'
    : 'Your Study Subject';

  const remainingMinutes = sessionState?.remainingMs
    ? Math.max(1, Math.ceil(sessionState.remainingMs / 60000))
    : 20;

  const handleReturnToStudy = () => {
    setIsSubmitting(true);
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage<ExtensionMessage>({
        type: 'INTERROGATION_B_RETURN',
      });
      // Attempt window close
      setTimeout(() => {
        window.close();
      }, 200);
    }
  };

  const handleProceedStudyResource = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    const query = searchQuery.trim();
    let targetUrl = 'https://www.google.com';

    if (query.startsWith('http://') || query.startsWith('https://')) {
      targetUrl = query;
    } else if (query) {
      targetUrl = `https://www.google.com/search?q=${encodeURIComponent(query + ' ' + subjectName)}`;
    }

    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage<ExtensionMessage>({
        type: 'INTERROGATION_A_CHOSEN',
        payload: { url: targetUrl },
      });
    }

    window.location.href = targetUrl;
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex flex-col items-center justify-center p-6 relative overflow-hidden select-none font-sans">
      {/* Background strobe / emergency flare effect */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-red-600 animate-pulse" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-2xl bg-[#121215] border-2 border-red-500/40 rounded-2xl shadow-[0_0_80px_rgba(239,68,68,0.25)] p-8 sm:p-10 relative z-10 backdrop-blur-xl">
        {/* Top Emergency Pill */}
        <div className="flex items-center justify-between mb-6 border-b border-zinc-800 pb-5">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 font-bold text-xs uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
            <span>Study Lockdown Active — Interrogation Chamber</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>GATE CSE 2027: <strong className="text-amber-400 font-mono">{gateCountdown.days}d {gateCountdown.hours}h {gateCountdown.minutes}m</strong></span>
          </div>
        </div>

        {view === 'initial' && (
          <div>
            <div className="flex items-start gap-4 mb-6">
              <div className="w-14 h-14 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-500 shrink-0">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
                  HALT! WHAT ARE YOU OPENING THIS TAB FOR?!
                </h1>
                <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">
                  You have an active study session running for{' '}
                  <strong className="text-white bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                    {subjectName}
                  </strong>
                  . Your timer is <strong className="text-red-400 uppercase font-mono">FROZEN</strong> at{' '}
                  <strong className="text-amber-300 font-mono">{remainingMinutes}m</strong> remaining.
                </p>
              </div>
            </div>

            <div className="space-y-4 my-8">
              {/* Option A */}
              <button
                type="button"
                onClick={() => setView('study-search')}
                className="w-full text-left p-5 rounded-xl bg-zinc-900/90 border border-zinc-700/80 hover:border-indigo-500/80 hover:bg-zinc-800/80 transition-all duration-200 group flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-100 group-hover:text-white text-base">
                      (A) I'm only looking for study-related content
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Declare research topics or documentation for {subjectName}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-zinc-500 group-hover:text-indigo-400 transition-colors" />
              </button>

              {/* Option B */}
              <button
                type="button"
                onClick={() => setView('grill')}
                className="w-full text-left p-5 rounded-xl bg-red-950/20 border border-red-500/30 hover:border-red-500 hover:bg-red-950/40 transition-all duration-200 group flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 group-hover:scale-105 transition-transform">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-red-200 group-hover:text-red-100 text-base">
                      (B) I was being distracted / I'm bored and need a break
                    </h3>
                    <p className="text-xs text-red-400/80 mt-0.5">
                      Show me the truth and remind me why I started
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-red-500 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="text-center text-xs text-zinc-500 border-t border-zinc-800/80 pt-4">
              Back to Basics Zero-Compromise Accountability • Non-study tabs will be strictly policed
            </div>
          </div>
        )}

        {view === 'study-search' && (
          <div>
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Declare Your Study Resource
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  What study materials or documentation do you need for <strong>{subjectName}</strong>?
                </p>
              </div>
            </div>

            <form onSubmit={handleProceedStudyResource} className="space-y-4 my-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. GeeksforGeeks OS scheduling algorithms, or URL..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setView('initial')}
                  className="px-5 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  <span>Proceed to Study Resource (Resume Timer)</span>
                </button>
              </div>
            </form>

            <div className="p-3.5 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Warning:</strong> Any subsequent navigation to blacklisted or entertainment websites will instantly terminate this tab and trigger strikes.
              </span>
            </div>
          </div>
        )}

        {view === 'grill' && (
          <div className="text-center py-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-600/20 border-2 border-red-500/50 text-red-500 mb-5 animate-bounce">
              <Flame className="w-9 h-9" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
              🚨 REMEMBER WHY YOU STARTED!
            </h2>

            <div className="my-6 p-6 rounded-2xl bg-gradient-to-b from-red-950/40 to-zinc-900/80 border border-red-500/40 text-left space-y-4">
              <div className="flex items-center justify-between border-b border-red-500/20 pb-4">
                <div>
                  <span className="text-xs uppercase tracking-wider font-bold text-red-400">Target Benchmark</span>
                  <h4 className="text-lg font-extrabold text-white">GATE CSE 2027</h4>
                </div>
                <div className="text-right">
                  <span className="text-xs uppercase tracking-wider font-bold text-zinc-400">Exam Live Countdown</span>
                  <div className="text-base font-black text-amber-400 font-mono">
                    {gateCountdown.days}d {gateCountdown.hours}h {gateCountdown.minutes}m {gateCountdown.seconds}s
                  </div>
                </div>
              </div>

              <div className="text-sm text-zinc-300 leading-relaxed space-y-2">
                <p>
                  You still have <strong className="text-white font-mono bg-zinc-800 px-1.5 py-0.5 rounded">{remainingMinutes} minutes</strong> left in this study block!
                </p>
                <p className="text-zinc-400">
                  Every minute you waste opening tabs to procrastinate is a rank surrendered to your competitors. On 7 February 2027, every mark will determine your future.
                </p>
                <p className="font-semibold text-red-300 text-base pt-1">
                  Stop looking for an escape. Get back to studying <span className="underline decoration-red-500 underline-offset-4">{subjectName}</span> right now!
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleReturnToStudy}
                disabled={isSubmitting}
                className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-base uppercase tracking-wider shadow-xl shadow-red-600/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3"
              >
                <Flame className="w-5 h-5" />
                <span>🔥 Return to Designated Study Material Immediately</span>
              </button>

              <button
                type="button"
                onClick={() => setView('initial')}
                className="text-xs text-zinc-500 hover:text-zinc-400 py-1 transition-colors"
              >
                ← Back to choices
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
