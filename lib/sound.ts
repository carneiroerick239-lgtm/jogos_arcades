import { useSyncExternalStore } from 'react';

/**
 * Web Audio API 8-Bit Retro Synthesizer
 * Generates classic chiptune sound effects without any external files or network requests.
 */

class RetroAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // AudioContext will be initialized on first user interaction
    if (typeof window !== 'undefined') {
      const savedMute = localStorage.getItem('retro_arcade_muted');
      this.isMuted = savedMute === 'true';
    }
  }

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('retro_arcade_muted', String(muted));
      window.dispatchEvent(new Event('retro_audio_changed'));
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  /**
   * Play a retro tone with pitch glide and gain envelope
   */
  public playTone(
    startFreq: number,
    endFreq: number,
    durationMs: number,
    type: OscillatorType = 'square',
    gainValue = 0.15
  ) {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      const now = ctx.currentTime;
      const durationSec = durationMs / 1000;

      osc.frequency.setValueAtTime(startFreq, now);
      if (startFreq !== endFreq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), now + durationSec);
      }

      gain.gain.setValueAtTime(gainValue, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + durationSec);
    } catch {
      // Audio playback fails gracefully if blocked by autoplay policies
    }
  }

  /**
   * Sound effect: Coin Insert / Creditar ficha
   */
  public coin() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // First high note (B5) then (E6)
    this.playTone(987.77, 987.77, 80, 'square', 0.15);
    setTimeout(() => {
      this.playTone(1318.51, 1318.51, 280, 'square', 0.15);
    }, 80);
  }

  /**
   * Sound effect: Jump / Move blip
   */
  public blip(freq = 240) {
    this.playTone(freq, freq * 1.5, 45, 'triangle', 0.1);
  }

  /**
   * Sound effect: Eat item / Point score
   */
  public eat() {
    this.playTone(400, 800, 70, 'square', 0.12);
  }

  /**
   * Sound effect: Golden bonus item
   */
  public bonus() {
    if (this.isMuted) return;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, freq * 1.1, 70, 'square', 0.12);
      }, idx * 60);
    });
  }

  /**
   * Sound effect: Laser shoot
   */
  public laser() {
    this.playTone(880, 180, 110, 'sawtooth', 0.12);
  }

  /**
   * Sound effect: Paddle bounce (Pong / Breakout)
   */
  public bounce(pitch = 300) {
    this.playTone(pitch, pitch * 0.9, 50, 'square', 0.15);
  }

  /**
   * Sound effect: Brick destroy / Hit
   */
  public hit() {
    this.playTone(280, 120, 80, 'sawtooth', 0.18);
  }

  /**
   * Sound effect: Explosion
   */
  public explosion() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const bufferSize = ctx.sampleRate * 0.25;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.25);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
    } catch {
      this.playTone(150, 40, 200, 'sawtooth', 0.2);
    }
  }

  /**
   * Sound effect: Line clear (Tetris)
   */
  public lineClear(isTetra = false) {
    if (this.isMuted) return;
    const chords = isTetra ? [440, 554, 659, 880, 1108] : [330, 440, 550];
    chords.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, freq * 1.2, 90, 'square', 0.15);
      }, idx * 70);
    });
  }

  /**
   * Sound effect: Game Over
   */
  public gameOver() {
    if (this.isMuted) return;
    const notes = [350, 310, 270, 220, 170];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, freq * 0.95, 140, 'sawtooth', 0.18);
      }, idx * 130);
    });
  }

  /**
   * Sound effect: Victory / Level complete
   */
  public victory() {
    if (this.isMuted) return;
    const notes = [392, 523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, freq, 120, 'square', 0.18);
      }, idx * 110);
    });
  }

  /**
   * Sound effect: Flag placed (Minesweeper)
   */
  public flag() {
    this.playTone(600, 750, 40, 'triangle', 0.1);
  }

  /**
   * Sound effect: Pacman munch / Waka
   */
  public waka(isHigh = false) {
    if (this.isMuted) return;
    const f1 = isHigh ? 420 : 320;
    const f2 = isHigh ? 350 : 250;
    this.playTone(f1, f2, 45, 'triangle', 0.12);
  }

  /**
   * Sound effect: Frogger hop / Jump
   */
  public hop() {
    this.playTone(280, 520, 55, 'square', 0.1);
  }

  public jump() {
    this.hop();
  }

  /**
   * Sound effect: Tactile physical arcade microswitch click
   */
  public microswitchClick(freq = 750) {
    this.playTone(freq, freq * 0.4, 18, 'triangle', 0.12);
  }

  /**
   * Sound effect: Arcade roulette tick
   */
  public rouletteTick(freq = 600) {
    this.playTone(freq, freq * 1.3, 30, 'square', 0.08);
  }


  /**
   * Sound effect: Flappy flap
   */
  public flap() {
    this.playTone(320, 680, 60, 'triangle', 0.12);
  }

  /**
   * Sound effect: Rocket Thruster / Laser burn
   */
  public thrust() {
    this.playTone(90, 70, 70, 'sawtooth', 0.08);
  }

  /**
   * Sound effect: Token Drop (Connect 4)
   */
  public tokenDrop() {
    this.playTone(520, 260, 90, 'triangle', 0.18);
  }

  /**
   * Sound effect: Soccer Whistle (Referee)
   */
  public whistle() {
    if (this.isMuted) return;
    this.playTone(2800, 3100, 100, 'sine', 0.2);
    setTimeout(() => {
      this.playTone(2900, 3200, 220, 'sine', 0.22);
    }, 110);
  }

  /**
   * Sound effect: Soccer Kick (impact)
   */
  public kick() {
    this.playTone(180, 60, 70, 'triangle', 0.25);
  }

  /**
   * Sound effect: Goal Celebration Fanfare
   */
  public goalCheer() {
    if (this.isMuted) return;
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, freq, 140, 'square', 0.2);
      }, idx * 100);
    });
  }

  /**
   * Sound effect: Engine acceleration / rev
   */
  public engineRev() {
    this.playTone(85, 160, 120, 'sawtooth', 0.1);
  }

  /**
   * Sound effect: Tire skid / drift / banana slip
   */
  public skid() {
    if (this.isMuted) return;
    this.playTone(700, 350, 150, 'sawtooth', 0.15);
  }

  /**
   * Sound effect: Kart Item Box Pickup
   */
  public kartItem() {
    if (this.isMuted) return;
    const arpeggio = [440, 554, 659, 880];
    arpeggio.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, freq * 1.05, 50, 'square', 0.12);
      }, idx * 50);
    });
  }

  /**
   * Sound effect: Kart Shell Shot
   */
  public kartShell() {
    this.playTone(600, 220, 90, 'triangle', 0.16);
  }

  /**
   * Sound effect: Memory card flip
   */
  public cardFlip() {
    this.playTone(450, 600, 40, 'triangle', 0.1);
  }

  /**
   * Sound effect: Memory pair matched
   */
  public cardMatch() {
    if (this.isMuted) return;
    this.playTone(523.25, 659.25, 80, 'square', 0.15);
    setTimeout(() => {
      this.playTone(783.99, 1046.50, 160, 'square', 0.18);
    }, 90);
  }

  /**
   * Sound effect: Wrong guess buzzer (Hangman)
   */
  public buzzer() {
    this.playTone(160, 120, 160, 'sawtooth', 0.2);
  }
}

export const retroAudio = new RetroAudioEngine();

function subscribeAudio(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('retro_audio_changed', callback);
  return () => {
    window.removeEventListener('retro_audio_changed', callback);
  };
}

function getAudioSnapshot() {
  return retroAudio.getMuted();
}

function getServerAudioSnapshot() {
  return false;
}

export function useAudioMuted(): boolean {
  return useSyncExternalStore(subscribeAudio, getAudioSnapshot, getServerAudioSnapshot);
}

