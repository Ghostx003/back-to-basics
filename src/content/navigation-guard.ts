/**
 * NavigationGuard renders:
 * 1. Accountability modal when opening an unapproved link/tab:
 *    "WHAT ARE YOU DOING?"
 *    1. "I am just watching resources related to subject"
 *    2. "Sorry I was being distracted" (redirects back to designated resource)
 * 2. Block screen when navigating to a blocked site (Netflix, Reddit, X.com, porn sites)
 * 3. Reopened prompt when study tab was closed:
 *    "YOU ARE NOT DONE YET!"
 *    "If you want to close the session, I will let you quit."
 */

export class NavigationGuard {
  private container: HTMLDivElement | null = null;
  private shadow: ShadowRoot | null = null;

  private ensureContainer() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'back-to-basics-nav-guard-host';
      this.container.style.position = 'fixed';
      this.container.style.top = '0';
      this.container.style.left = '0';
      this.container.style.width = '100vw';
      this.container.style.height = '100vh';
      this.container.style.zIndex = '2147483646';
      this.container.style.pointerEvents = 'auto';

      this.shadow = this.container.attachShadow({ mode: 'open' });
      document.documentElement.appendChild(this.container);
    }
  }

  /**
   * Prompts the user when navigating to an unapproved tab or page.
   */
  public showPrompt(
    destinationUrl: string,
    onApprove: (url: string) => void,
    onReject: () => void
  ) {
    this.ensureContainer();
    if (!this.shadow) return;

    let displayDomain = '';
    try {
      displayDomain = new URL(destinationUrl).hostname;
    } catch {
      displayDomain = destinationUrl;
    }

    this.shadow.innerHTML = `
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        .backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background-color: rgba(0, 0, 0, 0.88);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          user-select: none;
        }
        .card {
          background-color: #121215;
          border: 1px solid #3f3f46;
          border-radius: 1rem;
          padding: 2rem;
          max-width: 460px;
          width: 100%;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
          color: #f4f4f5;
        }
        .header {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          margin-bottom: 1.25rem;
        }
        .badge {
          width: 2.75rem;
          height: 2.75rem;
          border-radius: 0.75rem;
          background-color: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ef4444;
          font-size: 1.4rem;
          font-weight: bold;
        }
        .title {
          font-size: 1.35rem;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.01em;
          text-transform: uppercase;
        }
        .desc {
          font-size: 0.95rem;
          color: #a1a1aa;
          line-height: 1.5;
          margin-bottom: 0.75rem;
        }
        .url-box {
          background-color: #18181b;
          border: 1px solid #27272a;
          border-radius: 0.5rem;
          padding: 0.6rem 0.85rem;
          font-size: 0.85rem;
          color: #e4e4e7;
          margin-bottom: 1.5rem;
          word-break: break-all;
          font-family: monospace;
        }
        .btn-group {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .btn {
          appearance: none;
          padding: 0.85rem 1.15rem;
          border-radius: 0.625rem;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          border: 1px solid transparent;
        }
        .btn-redirect {
          background-color: #ef4444;
          color: #ffffff;
        }
        .btn-redirect:hover {
          background-color: #dc2626;
        }
        .btn-resource {
          background-color: #18181b;
          color: #d4d4d8;
          border-color: #27272a;
        }
        .btn-resource:hover {
          background-color: #27272a;
          color: #ffffff;
        }
      </style>
      <div class="backdrop">
        <div class="card">
          <div class="header">
            <div class="badge">⚠️</div>
            <h2 class="title">WHAT ARE YOU DOING?</h2>
          </div>
          <p class="desc">
            You opened a page outside your designated study curriculum. Stay accountable:
          </p>
          <div class="url-box">${displayDomain}</div>
          <div class="btn-group">
            <button id="reject-btn" class="btn btn-redirect" type="button">
              2. Sorry, I was being distracted (Take me back)
            </button>
            <button id="approve-btn" class="btn btn-resource" type="button">
              1. I am just watching resources related to subject
            </button>
          </div>
        </div>
      </div>
    `;

    const approveBtn = this.shadow.getElementById('approve-btn');
    const rejectBtn = this.shadow.getElementById('reject-btn');

    approveBtn?.addEventListener('click', () => {
      this.hide();
      onApprove(destinationUrl);
    });

    rejectBtn?.addEventListener('click', () => {
      this.hide();
      onReject();
    });
  }

  /**
   * Displays full block screen for blacklisted websites.
   */
  public showBlockedNotice(blockedUrl: string, onReturnToStudy: () => void) {
    this.ensureContainer();
    if (!this.shadow) return;

    let displayDomain = '';
    try {
      displayDomain = new URL(blockedUrl).hostname;
    } catch {
      displayDomain = blockedUrl;
    }

    this.shadow.innerHTML = `
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        .backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background-color: #000000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          user-select: none;
        }
        .card {
          background-color: #121215;
          border: 1px solid #dc2626;
          border-radius: 1.25rem;
          padding: 2.5rem;
          max-width: 500px;
          width: 100%;
          text-align: center;
          box-shadow: 0 0 50px rgba(220, 38, 38, 0.2);
          color: #f4f4f5;
        }
        .icon {
          font-size: 3.5rem;
          margin-bottom: 1rem;
        }
        .title {
          font-size: 1.75rem;
          font-weight: 800;
          color: #ef4444;
          text-transform: uppercase;
          margin-bottom: 0.75rem;
          letter-spacing: -0.01em;
        }
        .desc {
          font-size: 1rem;
          color: #a1a1aa;
          line-height: 1.6;
          margin-bottom: 1.5rem;
        }
        .blocked-badge {
          display: inline-block;
          background-color: #27272a;
          color: #f87171;
          font-family: monospace;
          padding: 0.4rem 0.8rem;
          border-radius: 0.5rem;
          margin-bottom: 2rem;
          font-size: 0.9rem;
        }
        .btn {
          appearance: none;
          background-color: #6366f1;
          color: #ffffff;
          padding: 0.9rem 1.75rem;
          border-radius: 0.625rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: background-color 0.15s ease;
          width: 100%;
        }
        .btn:hover {
          background-color: #4f46e5;
        }
      </style>
      <div class="backdrop">
        <div class="card">
          <div class="icon">⛔</div>
          <h2 class="title">DISTRACTION BLOCKED!</h2>
          <p class="desc">
            This website is on your active study blocklist. Back to Basics blocked access so you stay focused on your learning goal.
          </p>
          <div class="blocked-badge">${displayDomain}</div>
          <button id="return-study-btn" class="btn" type="button">
            Return to Designated Study Material
          </button>
        </div>
      </div>
    `;

    const returnBtn = this.shadow.getElementById('return-study-btn');
    returnBtn?.addEventListener('click', () => {
      this.hide();
      onReturnToStudy();
    });
  }

  /**
   * Prompts when the user closed the designated study tab.
   */
  public showReopenedPrompt(onContinue: () => void, onQuit: () => void) {
    this.ensureContainer();
    if (!this.shadow) return;

    this.shadow.innerHTML = `
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        .backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background-color: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          user-select: none;
        }
        .card {
          background-color: #121215;
          border: 1px solid #f59e0b;
          border-radius: 1rem;
          padding: 2rem;
          max-width: 460px;
          width: 100%;
          box-shadow: 0 0 40px rgba(245, 158, 11, 0.15);
          color: #f4f4f5;
        }
        .header {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          margin-bottom: 1rem;
        }
        .badge {
          width: 2.75rem;
          height: 2.75rem;
          border-radius: 0.75rem;
          background-color: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #f59e0b;
          font-size: 1.3rem;
          font-weight: bold;
        }
        .title {
          font-size: 1.25rem;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.01em;
          text-transform: uppercase;
        }
        .desc {
          font-size: 0.95rem;
          color: #a1a1aa;
          line-height: 1.5;
          margin-bottom: 1.5rem;
        }
        .btn-group {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .btn {
          appearance: none;
          padding: 0.85rem 1.15rem;
          border-radius: 0.625rem;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          border: 1px solid transparent;
        }
        .btn-primary {
          background-color: #6366f1;
          color: #ffffff;
        }
        .btn-primary:hover {
          background-color: #4f46e5;
        }
        .btn-quit {
          background-color: #18181b;
          color: #a1a1aa;
          border-color: #27272a;
        }
        .btn-quit:hover {
          background-color: #27272a;
          color: #ef4444;
          border-color: #ef4444;
        }
      </style>
      <div class="backdrop">
        <div class="card">
          <div class="header">
            <div class="badge">⏳</div>
            <h2 class="title">YOU ARE NOT DONE YET!</h2>
          </div>
          <p class="desc">
            You closed your designated study tab while your study session was still active. If you really want to close the session, I will let you quit. Otherwise, let's keep studying!
          </p>
          <div class="btn-group">
            <button id="continue-study-btn" class="btn btn-primary" type="button">
              Resume Studying
            </button>
            <button id="quit-session-btn" class="btn btn-quit" type="button">
              Quit Session
            </button>
          </div>
        </div>
      </div>
    `;

    const continueBtn = this.shadow.getElementById('continue-study-btn');
    const quitBtn = this.shadow.getElementById('quit-session-btn');

    continueBtn?.addEventListener('click', () => {
      this.hide();
      onContinue();
    });

    quitBtn?.addEventListener('click', () => {
      this.hide();
      onQuit();
    });
  }

  /**
   * New-tab interrogation:
   * "Hey, what are you opening this tab for?"
   * (A) "I'm only looking for study-related content"
   * (B) "I'm bored and need a break."
   * If B: Motivational GATE CSE 2027 countdown warning.
   */
  public showNewTabInterrogation(
    subjectName: string,
    remainingMinutes: number,
    daysToGate: number,
    onChoiceA: () => void,
    onChoiceBReturn: () => void
  ) {
    this.ensureContainer();
    if (!this.shadow) return;

    const targetSubject = subjectName ? `studying ${subjectName}` : 'your studies';

    this.shadow.innerHTML = `
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        .backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background-color: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          user-select: none;
        }
        .card {
          background-color: #121215;
          border: 1px solid #6366f1;
          border-radius: 1.25rem;
          padding: 2.25rem;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 0 50px rgba(99, 102, 241, 0.25);
          color: #f4f4f5;
        }
        .header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.25rem;
        }
        .badge {
          width: 3rem;
          height: 3rem;
          border-radius: 0.85rem;
          background-color: rgba(99, 102, 241, 0.2);
          border: 1px solid rgba(99, 102, 241, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #818cf8;
          font-size: 1.5rem;
        }
        .title {
          font-size: 1.35rem;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.01em;
        }
        .desc {
          font-size: 0.95rem;
          color: #a1a1aa;
          line-height: 1.5;
          margin-bottom: 1.75rem;
        }
        .btn-group {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
        .btn {
          appearance: none;
          padding: 1rem 1.25rem;
          border-radius: 0.75rem;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          text-align: left;
          border: 1px solid transparent;
        }
        .btn-a {
          background-color: #1e1e24;
          color: #f4f4f5;
          border-color: #27272a;
        }
        .btn-a:hover {
          background-color: #27272e;
          border-color: #6366f1;
        }
        .btn-b {
          background-color: #272023;
          color: #fda4af;
          border-color: #4c1d28;
        }
        .btn-b:hover {
          background-color: #3b1b24;
          border-color: #f43f5e;
        }
        .motive-box {
          background-color: #18181b;
          border: 1px solid #f59e0b;
          border-radius: 0.75rem;
          padding: 1.25rem;
          margin-bottom: 1.5rem;
        }
        .motive-title {
          color: #f59e0b;
          font-weight: 700;
          font-size: 1.1rem;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .motive-text {
          font-size: 0.925rem;
          line-height: 1.6;
          color: #e4e4e7;
        }
        .gate-badge {
          display: inline-block;
          background-color: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
          padding: 0.2rem 0.5rem;
          border-radius: 0.35rem;
          font-weight: 700;
          font-family: monospace;
        }
      </style>
      <div class="backdrop">
        <div id="initial-card" class="card">
          <div class="header">
            <div class="badge">🎯</div>
            <h2 class="title">Hey, what are you opening this tab for?</h2>
          </div>
          <p class="desc">
            Your study session is currently running. We paused the timer so you can declare your intention.
          </p>
          <div class="btn-group">
            <button id="btn-choice-a" class="btn btn-a" type="button">
              (A) I'm only looking for study-related content
            </button>
            <button id="btn-choice-b" class="btn btn-b" type="button">
              (B) I'm bored and need a break
            </button>
          </div>
        </div>

        <div id="motive-card" class="card" style="display: none;">
          <div class="motive-box">
            <div class="motive-title">
              <span>⏳</span> Remember Why You Started
            </div>
            <p class="motive-text">
              You still have <strong>${remainingMinutes} minutes</strong> left in this interval!
              <br/><br/>
              <strong>GATE CSE is on 7 February 2027.</strong> Only <span class="gate-badge">${daysToGate} days left</span>.
              <br/><br/>
              Every minute counts toward your score. Get back to <strong>${targetSubject}</strong>!
            </p>
          </div>
          <button id="btn-motive-return" class="btn btn-a" style="justify-content: center; width: 100%;" type="button">
            Return to Study Session
          </button>
        </div>
      </div>
    `;

    const choiceABtn = this.shadow.getElementById('btn-choice-a');
    const choiceBBtn = this.shadow.getElementById('btn-choice-b');
    const initialCard = this.shadow.getElementById('initial-card');
    const motiveCard = this.shadow.getElementById('motive-card');
    const motiveReturnBtn = this.shadow.getElementById('btn-motive-return');

    choiceABtn?.addEventListener('click', () => {
      this.hide();
      onChoiceA();
    });

    choiceBBtn?.addEventListener('click', () => {
      if (initialCard && motiveCard) {
        initialCard.style.display = 'none';
        motiveCard.style.display = 'block';
      }
    });

    motiveReturnBtn?.addEventListener('click', () => {
      this.hide();
      onChoiceBReturn();
    });
  }

  /**
   * Displays 3-strike warnings.
   */
  public showStrikeWarning(
    strike: number,
    message: string,
    isFinalCountdown = false,
    onCountdownFinished?: () => void
  ) {
    this.ensureContainer();
    if (!this.shadow) return;

    this.shadow.innerHTML = `
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        .backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background-color: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          user-select: none;
        }
        .card {
          background-color: #121215;
          border: 2px solid ${strike >= 3 ? '#ef4444' : '#f59e0b'};
          border-radius: 1.25rem;
          padding: 2.25rem;
          max-width: 480px;
          width: 100%;
          text-align: center;
          box-shadow: 0 0 50px ${strike >= 3 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.25)'};
          color: #f4f4f5;
        }
        .strike-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 0.9rem;
          border-radius: 9999px;
          font-size: 0.85rem;
          font-weight: 700;
          text-transform: uppercase;
          background-color: ${strike >= 3 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'};
          color: ${strike >= 3 ? '#f87171' : '#fbbf24'};
          margin-bottom: 1rem;
        }
        .title {
          font-size: 1.5rem;
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 0.75rem;
        }
        .msg {
          font-size: 1rem;
          color: #d4d4d8;
          line-height: 1.5;
          margin-bottom: 1.5rem;
        }
        .countdown {
          font-size: 3rem;
          font-weight: 900;
          color: #ef4444;
          margin-bottom: 1rem;
          font-family: monospace;
        }
        .btn {
          appearance: none;
          background-color: #6366f1;
          color: #ffffff;
          padding: 0.85rem 1.5rem;
          border-radius: 0.625rem;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          width: 100%;
        }
      </style>
      <div class="backdrop">
        <div class="card">
          <div class="strike-pill">Warning ${strike} of 3</div>
          <h2 class="title">${strike >= 3 ? 'Session Terminated' : 'Stick to Your Subject!'}</h2>
          <p class="msg">${message}</p>
          ${isFinalCountdown ? '<div id="countdown-num" class="countdown">5</div>' : ''}
          ${!isFinalCountdown ? '<button id="ack-btn" class="btn" type="button">Understood, Back to Study</button>' : ''}
        </div>
      </div>
    `;

    if (isFinalCountdown) {
      let count = 5;
      const countEl = this.shadow.getElementById('countdown-num');
      const timer = setInterval(() => {
        count--;
        if (countEl) countEl.textContent = String(count);
        if (count <= 0) {
          clearInterval(timer);
          this.hide();
          if (onCountdownFinished) onCountdownFinished();
        }
      }, 1000);
    } else {
      const ackBtn = this.shadow.getElementById('ack-btn');
      ackBtn?.addEventListener('click', () => {
        this.hide();
      });
    }
  }

  public hide() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
      this.container = null;
      this.shadow = null;
    }
  }
}
