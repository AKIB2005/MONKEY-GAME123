// ============================================================
//  storage.js  –  high score & preferences (safe localStorage)
// ============================================================
const Save = (() => {
  const KEY_HIGHSCORE = 'monkeyGame_highScore';
  const KEY_MUTE      = 'monkeyGame_muted';
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } };
  return {
    getHighScore() { return parseInt(get(KEY_HIGHSCORE) || '0', 10) || 0; },
    saveHighScore(score) {
      if (score > this.getHighScore()) { set(KEY_HIGHSCORE, score); return true; }
      return false;
    },
    isMuted()  { return get(KEY_MUTE) === 'true'; },
    setMuted(v) { set(KEY_MUTE, v); }
  };
})();
