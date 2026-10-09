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

  public hide() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
      this.container = null;
      this.shadow = null;
    }
  }
}
