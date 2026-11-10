const Storage = (() => {
  const KEY = 'monkeyRun_jungleReborn';
  const defaults = { highScore: 0, bestDistance: 0, bananas: 0, unlocked: ['runner'], selected: 'runner', muted: false, volume: 0.7, achievements: [] };
  function read() {
    try { return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
    catch (error) { console.warn('Unable to read saved progress.', error); return { ...defaults }; }
  }
  function write(data) { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (error) { console.warn('Unable to save progress.', error); } }
  return {
    get() { return read(); },
    saveRun(score, distance, bananas) {
      const data = read(); const high = score > data.highScore; const far = distance > data.bestDistance;
      data.highScore = Math.max(data.highScore, score); data.bestDistance = Math.max(data.bestDistance, distance); data.bananas += bananas;
      if (score >= 500 && !data.unlocked.includes('night')) data.unlocked.push('night');
      if (distance >= 1000 && !data.unlocked.includes('sunset')) data.unlocked.push('sunset');
      if (score >= 1000 && !data.achievements.includes('golden-run')) data.achievements.push('golden-run');
      write(data); return { ...data, high, far };
    },
    set(key, value) { const data = read(); data[key] = value; write(data); return data; },
    isUnlocked(id) { return read().unlocked.includes(id); },
    isMuted() { return read().muted; }
  };
})();
