// Procedural Web Audio API Radar & FLIR Suspense Sound Engine (Zero external assets)

class RadarSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private delayFilter: BiquadFilterNode | null = null;

  // Ambient suspense drone nodes
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private droneNoise: AudioBufferSourceNode | null = null;
  private droneGain: GainNode | null = null;
  private droneActive = false;

  private enabled = true;
  private unlocked = false;
  private lastTargetPingAt = 0;
  private lastSweepPingAt = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;

      const ctx = new AudioCtx();
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -16;
      compressor.knee.value = 18;
      compressor.ratio.value = 6;
      compressor.attack.value = 0.005;
      compressor.release.value = 0.2;

      const master = ctx.createGain();
      master.gain.value = this.enabled ? 0.42 : 0.0001;

      // Shared eerie radar echo/reverb feedback loop
      const delay = ctx.createDelay(1.0);
      delay.delayTime.value = 0.31;

      const delayFilter = ctx.createBiquadFilter();
      delayFilter.type = 'lowpass';
      delayFilter.frequency.value = 1450;

      const delayFeedback = ctx.createGain();
      delayFeedback.gain.value = 0.38;

      const delayWet = ctx.createGain();
      delayWet.gain.value = 0.48;

      delay.connect(delayFilter);
      delayFilter.connect(delayFeedback);
      delayFeedback.connect(delay);
      delayFilter.connect(delayWet);
      delayWet.connect(compressor);

      compressor.connect(master);
      master.connect(ctx.destination);

      this.ctx = ctx;
      this.masterGain = master;
      this.compressor = compressor;
      this.delayNode = delay;
      this.delayFeedback = delayFeedback;
      this.delayFilter = delayFilter;
    }
    return this.ctx;
  }

  public unlock(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx
        .resume()
        .then(() => {
          this.unlocked = true;
          if (this.enabled && this.droneActive) {
            this.startAmbientDrone();
          }
        })
        .catch(() => {
          // Will retry on next user interaction
        });
    } else {
      this.unlocked = true;
    }
  }

  public isUnlocked(): boolean {
    return this.unlocked && this.ctx?.state === 'running';
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    const ctx = this.ctx;
    if (ctx && this.masterGain) {
      const now = ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(enabled ? 0.42 : 0.0001, now, 0.06);
    }
    if (!enabled) {
      this.stopAmbientDrone();
    } else if (this.droneActive) {
      this.unlock();
      this.startAmbientDrone();
    }
  }

  public setScanningAmbient(active: boolean): void {
    this.droneActive = active;
    if (!active || !this.enabled) {
      this.stopAmbientDrone();
      return;
    }
    if (this.ctx?.state === 'running') {
      this.startAmbientDrone();
    }
  }

  private startAmbientDrone(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.compressor || ctx.state !== 'running' || !this.enabled) return;
    if (this.droneGain) return; // Already running

    const now = ctx.currentTime;
    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0.0001, now);
    droneGain.gain.exponentialRampToValueAtTime(0.16, now + 0.9);

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 135;
    lowpass.Q.value = 2.2;

    // Two slightly detuned deep sub-bass oscillators for a tense slow-beating command-room pulse
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 46;

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = 46.65;

    const osc2Gain = ctx.createGain();
    osc2Gain.gain.value = 0.28;

    // Dark filtered atmospheric room hiss
    const noiseLen = ctx.sampleRate * 2;
    const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
    const ch = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) {
      ch[i] = (Math.random() * 2 - 1) * 0.22;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    noise.loop = true;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 210;
    noiseFilter.Q.value = 1.6;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.06;

    osc1.connect(lowpass);
    osc2.connect(osc2Gain);
    osc2Gain.connect(lowpass);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(droneGain);
    lowpass.connect(droneGain);
    droneGain.connect(this.compressor);

    osc1.start(now);
    osc2.start(now);
    noise.start(now);

    this.droneOsc1 = osc1;
    this.droneOsc2 = osc2;
    this.droneNoise = noise;
    this.droneGain = droneGain;
  }

  private stopAmbientDrone(): void {
    const ctx = this.ctx;
    const gain = this.droneGain;
    const osc1 = this.droneOsc1;
    const osc2 = this.droneOsc2;
    const noise = this.droneNoise;

    this.droneGain = null;
    this.droneOsc1 = null;
    this.droneOsc2 = null;
    this.droneNoise = null;

    if (!ctx || !gain) return;
    const now = ctx.currentTime;
    try {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(0.0001, now, 0.08);
      setTimeout(() => {
        try {
          osc1?.stop();
          osc2?.stop();
          noise?.stop();
          gain.disconnect();
        } catch {
          // Ignore already stopped nodes
        }
      }, 360);
    } catch {
      // Ignore cleanup race
    }
  }

  // Deep haunting submarine/air-defense radar sweep pulse with echo tail
  public playSweepPulse(): void {
    if (!this.enabled) return;
    const ctx = this.ctx;
    if (!ctx || !this.compressor || !this.delayNode || ctx.state !== 'running') return;

    const nowMs = performance.now();
    if (nowMs - this.lastSweepPingAt < 1400) return;
    this.lastSweepPingAt = nowMs;

    const now = ctx.currentTime;

    // Primary resonant radar ping (slightly downward pitch drift for eerie realism)
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(920, now);
    osc.frequency.exponentialRampToValueAtTime(860, now + 0.42);

    // Metallic harmonic overtone
    const harmonic = ctx.createOscillator();
    harmonic.type = 'triangle';
    harmonic.frequency.setValueAtTime(1840, now);
    harmonic.frequency.exponentialRampToValueAtTime(1710, now + 0.22);

    const harmGain = ctx.createGain();
    harmGain.gain.setValueAtTime(0.0001, now);
    harmGain.gain.linearRampToValueAtTime(0.045, now + 0.012);
    harmGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

    // Deep sub-bass thump underneath the radar ping for suspense
    const thump = ctx.createOscillator();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(95, now);
    thump.frequency.exponentialRampToValueAtTime(38, now + 0.35);

    const thumpGain = ctx.createGain();
    thumpGain.gain.setValueAtTime(0.0001, now);
    thumpGain.gain.linearRampToValueAtTime(0.22, now + 0.015);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(0.18, now + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.58);

    osc.connect(env);
    harmonic.connect(harmGain);
    harmGain.connect(env);

    // Send ping both dry and into the echo feedback loop
    env.connect(this.compressor);
    env.connect(this.delayNode);

    thump.connect(thumpGain);
    thumpGain.connect(this.compressor);

    osc.start(now);
    harmonic.start(now);
    thump.start(now);

    osc.stop(now + 0.62);
    harmonic.stop(now + 0.28);
    thump.stop(now + 0.42);
  }

  // Intense target-lock blip when radar beam sweeps across an installation
  public playTargetLock(highPriority = false): void {
    if (!this.enabled) return;
    const ctx = this.ctx;
    if (!ctx || !this.compressor || !this.delayNode || ctx.state !== 'running') return;

    const nowMs = performance.now();
    if (nowMs - this.lastTargetPingAt < 260) return;
    this.lastTargetPingAt = nowMs;

    const now = ctx.currentTime;

    if (highPriority) {
      // Dramatic dual-pulse military target acquisition lock (F-16 / Strategic Base)
      const notes = [
        { freq: 1280, offset: 0, dur: 0.14, gain: 0.16 },
        { freq: 1720, offset: 0.095, dur: 0.24, gain: 0.18 },
      ];

      for (const n of notes) {
        const t0 = now + n.offset;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(n.freq, t0);
        osc.frequency.exponentialRampToValueAtTime(n.freq * 0.96, t0 + n.dur);

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(n.gain, t0 + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.dur);

        osc.connect(g);
        g.connect(this.compressor);
        g.connect(this.delayNode);
        osc.start(t0);
        osc.stop(t0 + n.dur + 0.03);
      }

      // Tense low impact pulse
      const sub = ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(84, now);
      sub.frequency.exponentialRampToValueAtTime(42, now + 0.22);

      const subG = ctx.createGain();
      subG.gain.setValueAtTime(0.0001, now);
      subG.gain.linearRampToValueAtTime(0.18, now + 0.01);
      subG.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

      sub.connect(subG);
      subG.connect(this.compressor);
      sub.start(now);
      sub.stop(now + 0.28);
    } else {
      // Crisp eerie sonar blip for standard base/camp detection
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1120, now);
      osc.frequency.exponentialRampToValueAtTime(1040, now + 0.18);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.12, now + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

      osc.connect(g);
      g.connect(this.compressor);
      g.connect(this.delayNode);
      osc.start(now);
      osc.stop(now + 0.24);
    }
  }

  // Dramatic infrared sensor sweep sound when running the FLIR Thermal Scanner
  public playThermalSweep(): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.compressor || !this.delayNode) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    if (ctx.state !== 'running') return;

    const now = ctx.currentTime;

    // Rising tense infrared scanner hum
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(92, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 1.05);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(240, now);
    filter.frequency.exponentialRampToValueAtTime(1600, now + 1.05);
    filter.Q.value = 3.5;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(0.15, now + 0.12);
    env.gain.setValueAtTime(0.13, now + 0.92);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 1.18);

    osc.connect(filter);
    filter.connect(env);
    env.connect(this.compressor);
    env.connect(this.delayNode);

    osc.start(now);
    osc.stop(now + 1.22);

    // Final thermal lock confirmation chime at end of 1.1s scan
    const lockT = now + 1.08;
    const lockOsc = ctx.createOscillator();
    lockOsc.type = 'sine';
    lockOsc.frequency.setValueAtTime(1480, lockT);
    lockOsc.frequency.exponentialRampToValueAtTime(1920, lockT + 0.12);

    const lockG = ctx.createGain();
    lockG.gain.setValueAtTime(0.0001, lockT);
    lockG.gain.linearRampToValueAtTime(0.16, lockT + 0.01);
    lockG.gain.exponentialRampToValueAtTime(0.0001, lockT + 0.28);

    lockOsc.connect(lockG);
    lockG.connect(this.compressor);
    lockG.connect(this.delayNode);
    lockOsc.start(lockT);
    lockOsc.stop(lockT + 0.32);
  }
}

export const radarAudio = new RadarSoundEngine();
