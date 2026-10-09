/**
 * VideoController implements layered video control strategies:
 * Strategy A: Standard HTML5 video/audio elements
 * Strategy B: YouTube-specific player APIs and controls
 * Strategy C: Bounded recovery and verification
 * Resumes only media that was actively playing before the break.
 * Never modifies playback rate/speed.
 */

export class VideoController {
  private wasPlayingBeforeBreak = false;
  private pausedMediaElements: HTMLMediaElement[] = [];

  /**
   * Checks if any media is currently actively playing on the page.
   */
  public isAnyMediaPlaying(): boolean {
    // 1. Check YouTube player if present
    const ytPlayer = (document.getElementById('movie_player') as any);
    if (ytPlayer && typeof ytPlayer.getPlayerState === 'function') {
      // 1 = playing, 3 = buffering
      const state = ytPlayer.getPlayerState();
      if (state === 1 || state === 3) {
        return true;
      }
    }

    // 2. Check standard HTMLMediaElements
    const mediaElements = Array.from(document.querySelectorAll<HTMLMediaElement>('video, audio'));
    return mediaElements.some((el) => !el.paused && !el.ended && el.currentTime > 0);
  }

  /**
   * Attempts to pause all active media on the page.
   * Returns whether any media was playing before pausing.
   */
  public async pauseAllMedia(): Promise<boolean> {
    const wasPlaying = this.isAnyMediaPlaying();
    this.wasPlayingBeforeBreak = wasPlaying;
    this.pausedMediaElements = [];

    // Strategy B: YouTube player API
    const ytPlayer = (document.getElementById('movie_player') as any);
    if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
      try {
        ytPlayer.pauseVideo();
      } catch (e) {
        console.warn('[Back to Basics] YouTube pauseVideo failed:', e);
      }
    }

    // Strategy A: Standard HTMLMediaElements
    const mediaElements = Array.from(document.querySelectorAll<HTMLMediaElement>('video, audio'));
    for (const media of mediaElements) {
      if (!media.paused && !media.ended) {
        try {
          media.pause();
          this.pausedMediaElements.push(media);
        } catch (e) {
          console.warn('[Back to Basics] Standard media pause failed:', e);
        }
      }
    }

    // Strategy C: Recovery check
    await this.verifyPausedWithRetry(3);

    return wasPlaying;
  }

  /**
   * Resumes playback if media was playing before the break.
   */
  public async resumeMedia(): Promise<void> {
    if (!this.wasPlayingBeforeBreak) {
      return;
    }

    // Reset flag to prevent duplicate resumes
    this.wasPlayingBeforeBreak = false;

    // Strategy B: YouTube player API
    const ytPlayer = (document.getElementById('movie_player') as any);
    if (ytPlayer && typeof ytPlayer.playVideo === 'function') {
      try {
        ytPlayer.playVideo();
        return;
      } catch (e) {
        console.warn('[Back to Basics] YouTube playVideo failed:', e);
      }
    }

    // Strategy A: Resume tracked media elements
    for (const media of this.pausedMediaElements) {
      if (media && media.paused) {
        try {
          const playPromise = media.play();
          if (playPromise !== undefined) {
            await playPromise.catch((err) => {
              // Autoplay restrictions or user interaction needed
              console.warn('[Back to Basics] Autoplay resume prevented by browser:', err);
            });
          }
        } catch (err) {
          console.warn('[Back to Basics] Could not resume media:', err);
        }
      }
    }

    this.pausedMediaElements = [];
  }

  /**
   * Bounded verification attempt to ensure media stopped playing.
   */
  private async verifyPausedWithRetry(maxAttempts: number): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 150));
      if (!this.isAnyMediaPlaying()) {
        return;
      }

      // Re-attempt pause on stubborn videos
      const mediaElements = Array.from(document.querySelectorAll<HTMLMediaElement>('video, audio'));
      for (const media of mediaElements) {
        if (!media.paused) {
          try {
            media.pause();
          } catch {}
        }
      }
    }
  }
}
