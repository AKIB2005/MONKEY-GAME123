// ============================================================
//  audio.js  –  procedural sound effects via Web Audio API
//  No external files needed – all sounds generated in-code
// ============================================================

const Audio = (() => {
  let ctx = null;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function playTone({ type = 'sine', freq = 440, freq2 = null, gain = 0.3,
                       attack = 0.01, decay = 0.1, duration = 0.15 }) {
    try {
      const c = getCtx();
      const osc = c.createOscillator();
      const gainNode = c.createGain();
      osc.connect(gainNode);
      gainNode.connect(c.destination);

      osc.type = type;
      osc.frequency.setValueAtTime(freq, c.currentTime);
      if (freq2) osc.frequency.exponentialRampToValueAtTime(freq2, c.currentTime + duration);

      gainNode.gain.setValueAtTime(0, c.currentTime);
      gainNode.gain.linearRampToValueAtTime(gain, c.currentTime + attack);
      gainNode.gain.exponentialRampToValueAtTime(0.001, c.currentTime + attack + decay);

      osc.start(c.currentTime);
      osc.stop(c.currentTime + duration);
    } catch(e) {}
  }

  function playNoise({ gain = 0.15, duration = 0.1, filterFreq = 800 }) {
    try {
      const c = getCtx();
      const bufferSize = c.sampleRate * duration;
      const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const source = c.createBufferSource();
      source.buffer = buffer;

      const filter = c.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = filterFreq;

      const gainNode = c.createGain();
      gainNode.gain.setValueAtTime(gain, c.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);

      source.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(c.destination);
      source.start();
    } catch(e) {}
  }

  return {
    // Bright cheerful collect sound
    eatBanana() {
      playTone({ type: 'triangle', freq: 523, freq2: 1046, gain: 0.25, attack: 0.005, decay: 0.12, duration: 0.14 });
    },
    // Double-note for bunch (more points!)
    eatBunch() {
      playTone({ type: 'triangle', freq: 659, freq2: 1318, gain: 0.28, attack: 0.005, decay: 0.08, duration: 0.1 });
      setTimeout(() => playTone({ type: 'triangle', freq: 784, freq2: 1568, gain: 0.22, attack: 0.005, decay: 0.1, duration: 0.12 }), 80);
    },
    // Thud + pitch drop for getting hit
    hitObstacle() {
      playNoise({ gain: 0.35, duration: 0.15, filterFreq: 300 });
      playTone({ type: 'sawtooth', freq: 220, freq2: 60, gain: 0.3, attack: 0.005, decay: 0.2, duration: 0.22 });
    },
    // Jump whoosh
    jump() {
      playTone({ type: 'sine', freq: 300, freq2: 600, gain: 0.15, attack: 0.01, decay: 0.1, duration: 0.12 });
    },
    // Sad descending for game over
    gameOver() {
      [0, 120, 240, 380].forEach((delay, i) => {
        const freqs = [392, 330, 262, 196];
        setTimeout(() => playTone({ type: 'triangle', freq: freqs[i], gain: 0.25, attack: 0.01, decay: 0.25, duration: 0.28 }), delay);
      });
    },
    // Fanfare for milestone
    milestone() {
      [0, 100, 200].forEach((delay, i) => {
        const freqs = [523, 659, 784];
        setTimeout(() => playTone({ type: 'square', freq: freqs[i], gain: 0.12, attack: 0.01, decay: 0.15, duration: 0.18 }), delay);
      });
    },
    // Level up chime
    levelUp() {
      [0, 80, 160, 260].forEach((delay, i) => {
        const freqs = [523, 659, 784, 1047];
        setTimeout(() => playTone({ type: 'triangle', freq: freqs[i], gain: 0.18, attack: 0.005, decay: 0.18, duration: 0.22 }), delay);
      });
    }
  };
})();
