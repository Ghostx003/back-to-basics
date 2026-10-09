import { describe, expect, it } from 'vitest';
import { SessionManager } from '../src/background/session-manager';
import { isBlockedUrl } from '../src/shared/blocklist';

describe('Blocklist and Distraction Guard Engine', () => {
  it('correctly identifies popular distraction domains', () => {
    expect(isBlockedUrl('https://netflix.com')).toBe(true);
    expect(isBlockedUrl('https://www.netflix.com/browse')).toBe(true);
    expect(isBlockedUrl('https://reddit.com/r/popular')).toBe(true);
    expect(isBlockedUrl('https://x.com/home')).toBe(true);
    expect(isBlockedUrl('https://twitter.com/i/trends')).toBe(true);
    expect(isBlockedUrl('https://instagram.com/explore')).toBe(true);
    expect(isBlockedUrl('https://tiktok.com/@user')).toBe(true);
    expect(isBlockedUrl('https://twitch.tv/streamer')).toBe(true);
  });

  it('blocks distracting YouTube shorts but allows standard educational lectures', () => {
    expect(isBlockedUrl('https://www.youtube.com/shorts/9z4X1')).toBe(true);
    expect(isBlockedUrl('https://youtube.com/shorts/abc')).toBe(true);
    // Regular lecture video must NOT be blocked!
    expect(isBlockedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(false);
  });

  it('blocks adult and dirty websites from the South Korea blocklist', () => {
    expect(isBlockedUrl('https://xvideos.com/video123')).toBe(true);
    expect(isBlockedUrl('https://pornhub.com/view_video.php')).toBe(true);
    expect(isBlockedUrl('https://xnxx.com')).toBe(true);
    expect(isBlockedUrl('https://redtube.com')).toBe(true);
    expect(isBlockedUrl('https://youporn.com')).toBe(true);
    expect(isBlockedUrl('https://brazzers.com')).toBe(true);
    expect(isBlockedUrl('https://hitomi.la')).toBe(true);
    expect(isBlockedUrl('https://hentaigasm.com')).toBe(true);
  });

  it('allows normal study and academic resources', () => {
    expect(isBlockedUrl('https://en.wikipedia.org/wiki/Calculus')).toBe(false);
    expect(isBlockedUrl('https://coursera.org/learn/algorithms')).toBe(false);
    expect(isBlockedUrl('https://mit.edu/courses')).toBe(false);
    expect(isBlockedUrl('https://github.com/torvalds/linux')).toBe(false);
    expect(isBlockedUrl('https://developer.mozilla.org/en-US/')).toBe(false);
  });

  it('handles quitSession by transitioning state to Idle and clearing tab references', async () => {
    const sessionManager = new SessionManager();
    await sessionManager.startScheduledStudy(
      [
        {
          id: 's-1',
          name: 'Operating Systems',
          url: 'https://example.com/os',
          durationMinutes: 30,
        },
      ],
      100
    );

    expect(sessionManager.getState().status).toBe('RunningStudy');

    const quitState = await sessionManager.quitSession();
    expect(quitState.status).toBe('Idle');
    expect(quitState.deadline).toBeNull();
    expect(quitState.managedTabId).toBeNull();
    expect(quitState.currentStudyUrl).toBeNull();
  });
});
