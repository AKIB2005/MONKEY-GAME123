// ============================================================
//  storage.js  –  high score & preferences via localStorage
// ============================================================

const Storage = (() => {
  const KEY_HIGHSCORE = 'monkeyGame_highScore';
  const KEY_MUTE      = 'monkeyGame_muted';

  return {
    getHighScore() {
      return parseInt(localStorage.getItem(KEY_HIGHSCORE) || '0', 10);
    },
    saveHighScore(score) {
      const current = this.getHighScore();
      if (score > current) {
        localStorage.setItem(KEY_HIGHSCORE, score);
        return true; // new high score!
      }
      return false;
    },
    isMuted() {
      return localStorage.getItem(KEY_MUTE) === 'true';
    },
    setMuted(val) {
      localStorage.setItem(KEY_MUTE, val);
    }
  };
})();
