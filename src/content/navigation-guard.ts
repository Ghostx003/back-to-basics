/**
 * NavigationGuard renders a non-intrusive modal when unexpected navigation is detected:
 * "Is this part of your study?"
 * Choices:
 * 1. "Yes, continue studying."
 * 2. "No, take me back."
 */

export class NavigationGuard {
  private container: HTMLDivElement | null = null;
  private shadow: ShadowRoot | null = null;

  public showPrompt(
    destinationUrl: string,
    onApprove: (url: string) => void,
    onReject: () => void
  ) {
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

    let displayDomain = '';
    try {
      displayDomain = new URL(destinationUrl).hostname;
    } catch {
      displayDomain = destinationUrl;
    }

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
          background-color: rgba(9, 9, 11, 0.75);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
        }
        .card {
          background-color: #121215;
          border: 1px solid #27272a;
          border-radius: 1rem;
          padding: 1.75rem;
          max-width: 440px;
          width: 100%;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          color: #f4f4f5;
        }
        .header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        .badge {
          width: 2.25rem;
          height: 2.25rem;
          border-radius: 0.5rem;
          background-color: rgba(99, 102, 241, 0.15);
          border: 1px solid rgba(99, 102, 241, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #818cf8;
          font-size: 1.15rem;
        }
        .title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #ffffff;
          letter-spacing: -0.01em;
        }
        .desc {
          font-size: 0.925rem;
          color: #a1a1aa;
          line-height: 1.5;
          margin-bottom: 0.75rem;
        }
        .url-box {
          background-color: #18181b;
          border: 1px solid #27272a;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.825rem;
          color: #71717a;
          margin-bottom: 1.5rem;
          word-break: break-all;
          font-family: monospace;
        }
        .btn-group {
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }
        .btn {
          appearance: none;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid transparent;
        }
        .btn-primary {
          background-color: #6366f1;
          color: #ffffff;
        }
        .btn-primary:hover {
          background-color: #4f46e5;
        }
        .btn-secondary {
          background-color: #18181b;
          color: #d4d4d8;
          border-color: #27272a;
        }
        .btn-secondary:hover {
          background-color: #27272a;
          color: #ffffff;
        }
      </style>
      <div class="backdrop">
        <div class="card">
          <div class="header">
            <div class="badge">🎯</div>
            <h2 class="title">Is this part of your study?</h2>
          </div>
          <p class="desc">
            You navigated to a new page during your study session. Choose whether to continue studying here or return to your previous page.
          </p>
          <div class="url-box">${displayDomain}</div>
          <div class="btn-group">
            <button id="approve-btn" class="btn btn-primary" type="button">
              Yes, continue studying
            </button>
            <button id="reject-btn" class="btn btn-secondary" type="button">
              No, take me back
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

  public hide() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
      this.container = null;
      this.shadow = null;
    }
  }
}
