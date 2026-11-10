const AudioFX = (() => {
  let context = null;
  function tone(frequency, duration, type = 'sine', gain = .12, slide = 0) {
    if (Storage.isMuted()) return;
    try {
      context ||= new (window.AudioContext || window.webkitAudioContext)();
      if (context.state === 'suspended') context.resume();
      const osc = context.createOscillator(), amp = context.createGain(), now = context.currentTime;
      osc.type = type; osc.frequency.setValueAtTime(frequency, now);
      if (slide) osc.frequency.exponentialRampToValueAtTime(slide, now + duration);
      amp.gain.setValueAtTime(.001, now); amp.gain.exponentialRampToValueAtTime(gain * Storage.get().volume, now + .01);
      amp.gain.exponentialRampToValueAtTime(.001, now + duration); osc.connect(amp); amp.connect(context.destination);
      osc.start(now); osc.stop(now + duration + .02);
    } catch (error) { console.warn('Audio unavailable.', error); }
  }
  return {
    jump: () => tone(290, .15, 'sine', .15, 620), slide: () => tone(140, .12, 'sawtooth', .08, 75),
    banana: () => { tone(620, .1, 'triangle', .17, 1040); setTimeout(() => tone(840, .1, 'triangle', .1), 65); },
    power: () => { tone(440, .12, 'square', .12, 880); setTimeout(() => tone(880, .18, 'square', .1, 1320), 90); },
    hit: () => tone(130, .25, 'sawtooth', .2, 45), over: () => [0,130,260].forEach((t,i) => setTimeout(() => tone([330,220,150][i], .25, 'triangle', .16), t)),
    click: () => tone(500, .05, 'sine', .08)
  };
})();
