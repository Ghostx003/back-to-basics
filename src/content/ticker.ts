/**
 * Ticker provides a clock-like ticking sound for the final 30 seconds of study.
 * Implemented using Web Audio API for zero-latency, zero-asset, low CPU usage.
 */

export class TickerSound {
  private audioContext: AudioContext | null = null;
  private timerId: number | null = null;
  private isTicking = false;
  private tickVariant = false;

  private initAudio() {
    if (!this.audioContext && typeof AudioContext !== 'undefined') {
      try {
        this.audioContext = new AudioContext();
      } catch (e) {
        console.warn('[Back to Basics] AudioContext could not be created:', e);
      }
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
  }

  /**
   * Generates a realistic, restrained clock tick.
   */
  private playTick() {
    if (!this.audioContext) return;

    try {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }

      const now = this.audioContext.currentTime;

      // Subtle mechanical tick using dual short pulses
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const filter = this.audioContext.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.value = this.tickVariant ? 1800 : 1200; // Alternating subtle tick-tock frequencies
      filter.Q.value = 8;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(this.tickVariant ? 950 : 800, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.025);

      gain.gain.setValueAtTime(0.06, now); // Gentle, quiet volume
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start(now);
      osc.stop(now + 0.03);

      this.tickVariant = !this.tickVariant;
    } catch {
      // Ignore if tab audio is restricted
    }
  }

  public start() {
    if (this.isTicking) return;
    this.initAudio();
    this.isTicking = true;
    this.playTick();

    this.timerId = window.setInterval(() => {
      this.playTick();
    }, 1000);
  }

  public stop() {
    if (!this.isTicking) return;
    this.isTicking = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}
