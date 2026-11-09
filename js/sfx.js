/* Vaultball Coach — tiny WebAudio synth sound effects (no audio files). */
(function () {
  const VB = (globalThis.VB = globalThis.VB || {});
  let ctx = null;
  let muted = false;
  try { muted = localStorage.getItem('vb_mute') === '1'; } catch (e) { /* storage blocked */ }
  const ac = () => { if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (C) ctx = new C(); } if (ctx && ctx.state === 'suspended') ctx.resume(); return ctx; };
  function tone(f, t0, dur, type, vol, f2) {
    const c = ac(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f, c.currentTime + t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, c.currentTime + t0 + dur);
    g.gain.setValueAtTime(0.0001, c.currentTime + t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.06, c.currentTime + t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t0 + dur);
    o.connect(g); g.connect(c.destination);
    o.start(c.currentTime + t0); o.stop(c.currentTime + t0 + dur + 0.02);
  }
  const SOUNDS = {
    pass: () => tone(520, 0, 0.08, 'triangle', 0.05, 880),
    catch: () => tone(660, 0, 0.05, 'triangle', 0.04),
    tackle: () => { tone(110, 0, 0.18, 'sawtooth', 0.07, 50); },
    shot: () => tone(300, 0, 0.35, 'sine', 0.05, 900),
    score: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.07, 0.16, 'square', 0.045)),
    miss: () => tone(240, 0, 0.3, 'sawtooth', 0.045, 120),
    right: () => { tone(880, 0, 0.09, 'triangle', 0.06); tone(1320, 0.08, 0.14, 'triangle', 0.06); },
    wrong: () => { tone(200, 0, 0.16, 'square', 0.05); tone(150, 0.14, 0.22, 'square', 0.05); },
    steal: () => [700, 900, 1200].forEach((f, i) => tone(f, i * 0.05, 0.1, 'triangle', 0.05)),
    rim: () => { tone(1500, 0, 0.05, 'square', 0.06); tone(820, 0.02, 0.28, 'triangle', 0.05, 760); },
    board: () => { tone(180, 0, 0.12, 'square', 0.07, 120); tone(520, 0.01, 0.08, 'triangle', 0.03); },
    whistle: () => tone(2100, 0, 0.25, 'sine', 0.035, 2000),
    click: () => tone(1200, 0, 0.03, 'triangle', 0.025),
  };
  VB.sfx = (name) => { if (muted) return; try { SOUNDS[name] && SOUNDS[name](); } catch (e) { /* audio unavailable */ } };
  VB.isMuted = () => muted;
  VB.toggleMute = () => { muted = !muted; try { localStorage.setItem('vb_mute', muted ? '1' : '0'); } catch (e) { /* */ } return muted; };
})();
