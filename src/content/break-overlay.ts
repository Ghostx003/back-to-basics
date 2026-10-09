/**
 * BreakOverlay renders a full-page, pitch-black break screen over the study tab
 * using an isolated Shadow DOM container to prevent host site CSS conflicts.
 */

export class BreakOverlay {
  private container: HTMLDivElement | null = null;
  private shadow: ShadowRoot | null = null;
  private intervalId: number | null = null;
  private onSkipCallback: (() => void) | null = null;

  public show(
    deadline: number,
    totalBreakMs: number,
    onSkip: () => void
  ) {
    this.onSkipCallback = onSkip;

    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'back-to-basics-break-overlay-host';
      this.container.style.position = 'fixed';
      this.container.style.top = '0';
      this.container.style.left = '0';
      this.container.style.width = '100vw';
      this.container.style.height = '100vh';
      this.container.style.zIndex = '2147483647'; // Max z-index
      this.container.style.pointerEvents = 'auto';

      this.shadow = this.container.attachShadow({ mode: 'open' });
      document.documentElement.appendChild(this.container);
    }

    this.render(deadline, totalBreakMs);

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
    }

    this.intervalId = window.setInterval(() => {
      this.updateCountdown(deadline, totalBreakMs);
    }, 500);
  }

  public hide() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
      this.container = null;
      this.shadow = null;
    }
  }

  private updateCountdown(deadline: number, totalBreakMs: number) {
    if (!this.shadow) return;

    const remaining = Math.max(0, deadline - Date.now());
    const totalSec = Math.floor(remaining / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    const timerTextEl = this.shadow.getElementById('countdown-text');
    if (timerTextEl) {
      timerTextEl.textContent = timeFormatted;
    }

    const circleProgress = this.shadow.getElementById('circle-progress');
    if (circleProgress) {
      const radius = 90;
      const circumference = 2 * Math.PI * radius;
      const progress = totalBreakMs > 0 ? (totalBreakMs - remaining) / totalBreakMs : 1;
      const offset = circumference - progress * circumference;
      circleProgress.style.strokeDashoffset = String(offset);
    }

    if (remaining <= 0) {
      this.hide();
    }
  }

  private render(deadline: number, totalBreakMs: number) {
    if (!this.shadow) return;

    const remaining = Math.max(0, deadline - Date.now());
    const totalSec = Math.floor(remaining / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    const radius = 90;
    const circumference = 2 * Math.PI * radius;
    const progress = totalBreakMs > 0 ? (totalBreakMs - remaining) / totalBreakMs : 1;
    const offset = circumference - progress * circumference;

    this.shadow.innerHTML = `
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        .overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background-color: #000000;
          color: #f4f4f5;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          user-select: none;
          z-index: 2147483647;
        }
        .header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .tag {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.35rem 0.85rem;
          border-radius: 9999px;
          background-color: rgba(99, 102, 241, 0.15);
          color: #818cf8;
          font-size: 0.875rem;
          font-weight: 500;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 0.75rem;
          border: 1px solid rgba(99, 102, 241, 0.3);
        }
        .title {
          font-size: 2.25rem;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.02em;
        }
        .subtitle {
          font-size: 1rem;
          color: #a1a1aa;
          margin-top: 0.5rem;
        }
        .timer-container {
          position: relative;
          width: 240px;
          height: 240px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 2.5rem;
        }
        svg {
          transform: rotate(-90deg);
        }
        circle.bg {
          stroke: #18181b;
        }
        circle.progress {
          stroke: #6366f1;
          stroke-linecap: round;
          transition: stroke-dashoffset 0.4s ease;
        }
        .countdown-display {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .countdown-time {
          font-size: 3.25rem;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          color: #ffffff;
          letter-spacing: -0.03em;
        }
        .countdown-label {
          font-size: 0.875rem;
          color: #71717a;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 0.25rem;
        }
        .actions {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }
        .skip-btn {
          appearance: none;
          background-color: #18181b;
          color: #d4d4d8;
          border: 1px solid #27272a;
          padding: 0.75rem 1.75rem;
          border-radius: 0.625rem;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }
        .skip-btn:hover {
          background-color: #27272a;
          color: #ffffff;
          border-color: #3f3f46;
        }
        .skip-btn:active {
          transform: scale(0.98);
        }
        .tip {
          font-size: 0.85rem;
          color: #52525b;
          text-align: center;
          max-width: 320px;
        }
      </style>
      <div class="overlay">
        <div class="header">
          <div class="tag">Rest & Recover</div>
          <h1 class="title">Break Time</h1>
          <p class="subtitle">Step away, stretch, and rest your eyes.</p>
        </div>

        <div class="timer-container">
          <svg width="240" height="240">
            <circle
              class="bg"
              stroke-width="10"
              fill="transparent"
              r="${radius}"
              cx="120"
              cy="120"
            />
            <circle
              id="circle-progress"
              class="progress"
              stroke-width="10"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${offset}"
              fill="transparent"
              r="${radius}"
              cx="120"
              cy="120"
            />
          </svg>
          <div class="countdown-display">
            <div id="countdown-text" class="countdown-time">${timeFormatted}</div>
            <div class="countdown-label">Remaining</div>
          </div>
        </div>

        <div class="actions">
          <button id="skip-break-btn" class="skip-btn" type="button">
            Skip break & continue
          </button>
          <p class="tip">The next study session starts automatically when this break ends.</p>
        </div>
      </div>
    `;

    const skipBtn = this.shadow.getElementById('skip-break-btn');
    if (skipBtn) {
      let isProcessing = false;
      skipBtn.addEventListener('click', () => {
        if (isProcessing) return; // Prevent duplicate clicks
        isProcessing = true;
        skipBtn.setAttribute('disabled', 'true');
        if (this.onSkipCallback) {
          this.onSkipCallback();
        }
        this.hide();
      });
    }
  }
}
