/* Vaultball Coach — vector-neon cyberpunk player sprites (SVG), generated deterministically from the player id.
   Big Five cues (subtle on purpose):
   E  posture: open arms / wide stance (high) vs arms crossed, head dipped (low)
   N  brow + mouth tension, slight jitter animation when N >= 7
   A  softer, rounder face and smile (high); hard jaw, flat mouth (low); body leans toward teammates
   C  neat kit, visor tucked (high) vs untucked jagged hem, visor askew, odd socks (low)
   O  hairstyle and hair colour: bold cut + bright neon (high) vs short, muted (low)
   Skin tone and body type are random (seeded by id), not linked to any trait. */
(function () {
  const VB = (globalThis.VB = globalThis.VB || {});

  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let s = seed || 1; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  const SKIN = ['#3b2219', '#5a3524', '#7a4a2f', '#9a6440', '#b67d52', '#cf9a6e', '#e2b48c', '#f0cba8', '#6b3f2a', '#a86f4c'];
  const HAIR_MUTED = ['#15121a', '#2a1c14', '#3b2a1e', '#1d1d24', '#4a3a2c'];
  const HAIR_MID = ['#5b3a8c', '#7a4b2a', '#2f5d7a', '#8a2e3a', '#c09a50'];
  const HAIR_NEON = ['#ff3df0', '#3dfcff', '#b6ff3d', '#ff8a1f', '#ffe14a', '#9d6bff'];

  // Visual "genes" from id (random) + traits (meaningful)
  VB.spriteGenes = function (p) {
    const r = rng(hash(String(p.id) + (p.name || '')));
    const b = p.b5 || { O: 5, C: 5, E: 5, A: 5, N: 5 };
    const O = b.O;
    const hairPool = O >= 7 ? HAIR_NEON : O >= 4 ? HAIR_MID : HAIR_MUTED;
    let style;
    if (O >= 8) style = ['mohawk', 'spikes', 'asym'][Math.floor(r() * 3)];
    else if (O >= 6) style = ['undercut', 'spikes', 'puff'][Math.floor(r() * 3)];
    else if (O >= 4) style = ['crop', 'puff', 'undercut'][Math.floor(r() * 3)];
    else style = ['buzz', 'crop'][Math.floor(r() * 2)];
    return {
      skin: SKIN[Math.floor(r() * SKIN.length)],
      build: [0.86, 0.94, 1, 1.08, 1.16][Math.floor(r() * 5)], // shoulder width
      height: [0.95, 1, 1.04][Math.floor(r() * 3)],
      hair: hairPool[Math.floor(r() * hairPool.length)],
      hair2: O >= 8 ? HAIR_NEON[Math.floor(r() * HAIR_NEON.length)] : null,
      style,
      visor: r() < 0.55,
      tattoo: O >= 7 && r() < 0.6,
      O, C: b.C, E: b.E, A: b.A, N: b.N,
    };
  };

  // Full body SVG, viewBox 0 0 100 160. opts: {team:'#hex', accent:'#hex', num, lean:-1..1, bust:bool, hurt:bool}
  VB.spriteSVG = function (p, opts) {
    opts = opts || {};
    const g = VB.spriteGenes(p);
    const team = opts.team || '#3dfcff';
    const accent = opts.accent || '#ff3df0';
    const W = g.build, H = g.height;
    const cx = 50;
    const lean = (opts.lean || 0) * (g.A >= 7 ? 6 : g.A >= 4 ? 3 : 0); // agreeable players lean in toward teammates
    const openE = g.E >= 7 ? 2 : g.E >= 4 ? 1 : 0; // posture
    const headDip = openE === 0 ? 3 : 0;
    const sh = 21 * W; // half shoulder width
    const hip = 14 * W;
    const neckY = 52 * H + headDip * 0.5, waistY = 96 * H, footY = 156;
    const stroke = 'stroke-linejoin="round" stroke-linecap="round"';
    const glow = `filter="url(#glow-${p.id})"`;
    let s = '';
    s += `<defs><filter id="glow-${p.id}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
    s += `<linearGradient id="kit-${p.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a1f3a"/><stop offset="1" stop-color="#0a0d1c"/></linearGradient></defs>`;
    s += `<g transform="rotate(${lean} 50 150)">`;
    // shadow
    s += `<ellipse cx="50" cy="156" rx="${22 * W}" ry="3.5" fill="${team}" opacity="0.25"/>`;
    // legs
    const stance = openE === 2 ? 13 : openE === 1 ? 10 : 7;
    const legW = 7.5 * W;
    const sockL = g.C <= 3 ? accent : team, sockR = team;
    s += `<path d="M${cx - 6} ${waistY} L${cx - stance} ${footY - 6}" stroke="#141833" stroke-width="${legW}" ${stroke}/>`;
    s += `<path d="M${cx + 6} ${waistY} L${cx + stance} ${footY - 6}" stroke="#141833" stroke-width="${legW}" ${stroke}/>`;
    s += `<path d="M${cx - stance + 1} ${footY - 18} L${cx - stance} ${footY - 7}" stroke="${sockL}" stroke-width="${legW * 0.9}" ${stroke} opacity=".9"/>`;
    s += `<path d="M${cx + stance - 1} ${footY - 18} L${cx + stance} ${footY - 7}" stroke="${sockR}" stroke-width="${legW * 0.9}" ${stroke} opacity=".9"/>`;
    // boots
    s += `<path d="M${cx - stance - 6} ${footY - 2} q2 -7 8 -6 l2 6 z" fill="#0b0d18" stroke="${team}" stroke-width="1.2" ${glow}/>`;
    s += `<path d="M${cx + stance + 6} ${footY - 2} q-2 -7 -8 -6 l-2 6 z" fill="#0b0d18" stroke="${team}" stroke-width="1.2" ${glow}/>`;
    // shorts
    s += `<path d="M${cx - hip} ${waistY - 4} L${cx + hip} ${waistY - 4} L${cx + hip + 3} ${waistY + 16} L${cx + 2} ${waistY + 16} L${cx} ${waistY + 8} L${cx - 2} ${waistY + 16} L${cx - hip - 3} ${waistY + 16} Z" fill="#11142a" stroke="${team}" stroke-width="1.3"/>`;
    // torso (kit)
    const hem = g.C >= 6
      ? `L${cx + hip + 1} ${waistY} L${cx - hip - 1} ${waistY}` // tucked, straight
      : g.C >= 4 ? `L${cx + hip + 3} ${waistY + 3} L${cx - hip - 3} ${waistY + 3}`
        : `L${cx + hip + 4} ${waistY + 6} L${cx + 6} ${waistY + 2} L${cx - 2} ${waistY + 7} L${cx - hip - 4} ${waistY + 4}`; // untucked, jagged
    s += `<path d="M${cx - sh} ${neckY + 6} Q${cx} ${neckY - 1} ${cx + sh} ${neckY + 6} L${cx + hip + 1} ${waistY - 6} ${hem} L${cx - hip - 1} ${waistY - 6} Z" fill="url(#kit-${p.id})" stroke="${team}" stroke-width="1.6" ${glow}/>`;
    // kit details: chest stripe + number
    s += `<path d="M${cx - sh + 4} ${neckY + 14} L${cx + sh - 4} ${neckY + 14}" stroke="${accent}" stroke-width="1.2" opacity=".85"/>`;
    if (opts.num != null) s += `<text x="${cx}" y="${neckY + 33}" text-anchor="middle" font-family="Orbitron,monospace" font-weight="700" font-size="14" fill="${team}" opacity=".95">${opts.num}</text>`;
    // arms
    const skin = g.skin;
    const armW = 6.2 * W;
    if (openE === 0) {
      // arms crossed: closed posture
      s += `<path d="M${cx - sh + 1} ${neckY + 9} L${cx - sh + 3} ${neckY + 26} L${cx + 9} ${neckY + 30}" stroke="#141833" stroke-width="${armW}" fill="none" ${stroke}/>`;
      s += `<path d="M${cx + sh - 1} ${neckY + 9} L${cx + sh - 3} ${neckY + 24} L${cx - 9} ${neckY + 27}" stroke="#1b2042" stroke-width="${armW}" fill="none" ${stroke}/>`;
      s += `<circle cx="${cx + 10}" cy="${neckY + 30}" r="3.2" fill="${skin}"/><circle cx="${cx - 10}" cy="${neckY + 27}" r="3.2" fill="${skin}"/>`;
    } else if (openE === 1) {
      s += `<path d="M${cx - sh + 1} ${neckY + 9} L${cx - sh - 3} ${neckY + 30} L${cx - sh - 1} ${neckY + 46}" stroke="#141833" stroke-width="${armW}" fill="none" ${stroke}/>`;
      s += `<path d="M${cx + sh - 1} ${neckY + 9} L${cx + sh + 3} ${neckY + 30} L${cx + sh + 1} ${neckY + 46}" stroke="#141833" stroke-width="${armW}" fill="none" ${stroke}/>`;
      s += `<circle cx="${cx - sh - 1}" cy="${neckY + 48}" r="3.4" fill="${skin}"/><circle cx="${cx + sh + 1}" cy="${neckY + 48}" r="3.4" fill="${skin}"/>`;
    } else {
      // open: one fist raised, other hand out — takes up space
      s += `<path d="M${cx - sh + 1} ${neckY + 9} L${cx - sh - 12} ${neckY + 2} L${cx - sh - 14} ${neckY - 14}" stroke="#141833" stroke-width="${armW}" fill="none" ${stroke}/>`;
      s += `<path d="M${cx + sh - 1} ${neckY + 9} L${cx + sh + 10} ${neckY + 26} L${cx + sh + 16} ${neckY + 36}" stroke="#141833" stroke-width="${armW}" fill="none" ${stroke}/>`;
      s += `<circle cx="${cx - sh - 14}" cy="${neckY - 16}" r="3.8" fill="${skin}"/><circle cx="${cx + sh + 16}" cy="${neckY + 38}" r="3.4" fill="${skin}"/>`;
    }
    // shoulder pads (neon)
    s += `<path d="M${cx - sh - 2} ${neckY + 10} q3 -8 12 -7" stroke="${team}" stroke-width="2" fill="none" ${glow}/>`;
    s += `<path d="M${cx + sh + 2} ${neckY + 10} q-3 -8 -12 -7" stroke="${team}" stroke-width="2" fill="none" ${glow}/>`;
    if (g.tattoo) s += `<path d="M${cx + sh + 6} ${neckY + 18} l3 3 l-3 3 l3 3" stroke="${g.hair}" stroke-width="1" fill="none" opacity=".9"/>`;
    // neck + head
    const hy = neckY - 20 + headDip; // head centre
    const faceRx = g.A >= 7 ? 13 : g.A >= 4 ? 12 : 11.2;
    const faceRy = g.A >= 7 ? 14.5 : 15.5;
    s += `<rect x="${cx - 4.5}" y="${neckY - 8 + headDip}" width="9" height="10" fill="${skin}"/>`;
    s += g.A >= 4
      ? `<ellipse cx="${cx}" cy="${hy}" rx="${faceRx}" ry="${faceRy}" fill="${skin}"/>`
      : `<path d="M${cx - faceRx} ${hy - 8} Q${cx - faceRx} ${hy - faceRy} ${cx} ${hy - faceRy} Q${cx + faceRx} ${hy - faceRy} ${cx + faceRx} ${hy - 8} L${cx + faceRx - 1} ${hy + 6} L${cx + 5} ${hy + faceRy} L${cx - 5} ${hy + faceRy} L${cx - faceRx + 1} ${hy + 6} Z" fill="${skin}"/>`;
    // hair
    s += hairSVG(g, cx, hy, faceRx, faceRy, glow);
    // eyes / brows / mouth — emotion cues
    const eyeY = hy - 1;
    const N = g.N;
    const browTilt = N >= 7 ? 3 : N >= 5 ? 1.2 : -0.8; // inner ends raised = worry
    const browY = eyeY - 5 - (N >= 7 ? 1 : 0);
    if (g.visor && g.C >= 5) {
      // neat visor across the eyes
      s += `<rect x="${cx - faceRx + 1}" y="${eyeY - 3.5}" width="${faceRx * 2 - 2}" height="6.5" rx="3" fill="${team}" opacity=".85" ${glow}/>`;
      s += `<rect x="${cx - faceRx + 3}" y="${eyeY - 2}" width="${faceRx * 2 - 6}" height="1.4" fill="#fff" opacity=".6"/>`;
    } else {
      s += `<ellipse cx="${cx - 4.6}" cy="${eyeY}" rx="2" ry="${N >= 7 ? 2.3 : 1.7}" fill="#f4f7ff"/><ellipse cx="${cx + 4.6}" cy="${eyeY}" rx="2" ry="${N >= 7 ? 2.3 : 1.7}" fill="#f4f7ff"/>`;
      s += `<circle cx="${cx - 4.4}" cy="${eyeY + 0.2}" r="1" fill="#0a0a14"/><circle cx="${cx + 4.8}" cy="${eyeY + 0.2}" r="1" fill="#0a0a14"/>`;
      if (g.visor) s += `<rect x="${cx - faceRx}" y="${hy - faceRy + 1}" width="${faceRx * 2}" height="5" rx="2.5" fill="${team}" opacity=".8" transform="rotate(${g.C <= 3 ? -12 : -5} ${cx} ${hy})" ${glow}/>`; // pushed up / askew
    }
    s += `<path d="M${cx - 7.5} ${browY + browTilt * 0.3} L${cx - 2} ${browY - browTilt}" stroke="#0d0b10" stroke-width="1.5" ${stroke}/>`;
    s += `<path d="M${cx + 7.5} ${browY + browTilt * 0.3} L${cx + 2} ${browY - browTilt}" stroke="#0d0b10" stroke-width="1.5" ${stroke}/>`;
    const my = hy + 7.5;
    let mouth;
    if (N >= 8) mouth = `M${cx - 4} ${my} l2 -1 l2 1 l2 -1 l2 1`; // tense, wobbly
    else if (g.A >= 7) mouth = `M${cx - 4.5} ${my - 1} Q${cx} ${my + 3.4} ${cx + 4.5} ${my - 1}`; // warm smile
    else if (g.A <= 3) mouth = `M${cx - 4} ${my + 0.5} L${cx + 4} ${my - 0.8}`; // flat smirk
    else if (N >= 6) mouth = `M${cx - 3.5} ${my + 1} Q${cx} ${my - 1} ${cx + 3.5} ${my + 1}`; // slight frown
    else mouth = `M${cx - 3.5} ${my} Q${cx} ${my + 1.8} ${cx + 3.5} ${my}`;
    s += `<path d="${mouth}" stroke="#2a0d14" stroke-width="1.4" fill="none" ${stroke}/>`;
    if (N >= 8) s += `<path d="M${cx + faceRx - 2} ${hy - 6} q1.5 2.5 0 4" stroke="#7fd8ff" stroke-width="1.2" fill="none" opacity=".8"/>`; // sweat
    if (g.A >= 7) s += `<circle cx="${cx - 7.5}" cy="${my - 2.5}" r="2.2" fill="#ff7aa8" opacity=".25"/><circle cx="${cx + 7.5}" cy="${my - 2.5}" r="2.2" fill="#ff7aa8" opacity=".25"/>`;
    if (opts.hurt) s += `<path d="M${cx - 9} ${hy - 9} l18 4" stroke="#fff" stroke-width="3" opacity=".9"/><path d="M${cx - 9} ${hy - 9} l18 4" stroke="#ff3b4e" stroke-width="1.2"/>`;
    s += `</g>`;
    const vb = opts.bust ? '8 4 84 92' : '0 0 100 160';
    const cls = 'spr' + (g.N >= 7 ? ' jitter' : '') + (opts.cls ? ' ' + opts.cls : '');
    return `<svg class="${cls}" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${s}</svg>`;
  };

  function hairSVG(g, cx, hy, rx, ry, glow) {
    const c = g.hair, c2 = g.hair2 || g.hair;
    const top = hy - ry;
    const strokeNeon = g.O >= 7 ? `stroke="${c2}" stroke-width="1" ${glow}` : '';
    switch (g.style) {
      case 'buzz': return `<path d="M${cx - rx} ${hy - 4} Q${cx - rx} ${top - 1} ${cx} ${top - 1} Q${cx + rx} ${top - 1} ${cx + rx} ${hy - 4} Q${cx} ${top + 4} ${cx - rx} ${hy - 4}Z" fill="${c}" opacity=".9"/>`;
      case 'crop': return `<path d="M${cx - rx - 1} ${hy - 2} Q${cx - rx - 2} ${top - 4} ${cx} ${top - 4} Q${cx + rx + 2} ${top - 4} ${cx + rx + 1} ${hy - 2} L${cx + rx - 2} ${top + 6} L${cx - rx + 2} ${top + 6} Z" fill="${c}"/>`;
      case 'puff': return `<circle cx="${cx}" cy="${top + 1}" r="${rx + 3}" fill="${c}"/><circle cx="${cx - rx}" cy="${top + 6}" r="6" fill="${c}"/><circle cx="${cx + rx}" cy="${top + 6}" r="6" fill="${c}"/>`;
      case 'undercut': return `<path d="M${cx - rx} ${hy - 3} L${cx - rx} ${top + 3} Q${cx - 4} ${top - 9} ${cx + rx + 6} ${top - 3} L${cx + rx} ${top + 5} Z" fill="${c}" ${strokeNeon}/>`;
      case 'spikes': {
        let d = `M${cx - rx - 1} ${hy - 3} `;
        const n = 6;
        for (let i = 0; i <= n; i++) { const x = cx - rx + (2 * rx * i) / n; d += `L${x - 2} ${top + 2} L${x} ${top - 9 - (i % 2) * 4} `; }
        d += `L${cx + rx + 1} ${hy - 3} Z`;
        return `<path d="${d}" fill="${c}" ${strokeNeon}/>`;
      }
      case 'mohawk': return `<path d="M${cx - rx} ${hy - 3} Q${cx - rx} ${top + 2} ${cx} ${top + 1} Q${cx + rx} ${top + 2} ${cx + rx} ${hy - 3}" fill="#0c0c14" opacity=".55"/><path d="M${cx - 4} ${top + 3} L${cx - 3} ${top - 16} L${cx} ${top - 22} L${cx + 3} ${top - 16} L${cx + 4} ${top + 3} Z" fill="${c}" stroke="${c2}" stroke-width="1.2" ${glow}/>`;
      case 'asym': default: return `<path d="M${cx - rx - 2} ${hy + 6} Q${cx - rx - 6} ${top - 6} ${cx + 2} ${top - 6} Q${cx + rx + 3} ${top - 4} ${cx + rx} ${hy - 6} L${cx + 2} ${top + 4} L${cx - rx + 3} ${hy + 2} Z" fill="${c}" stroke="${c2}" stroke-width="1.2" ${glow}/>`;
    }
  }

  // Canvas image cache for live play
  const imgCache = new Map();
  VB.spriteImage = function (p, team, accent, hurt) {
    const key = p.id + '|' + team + '|' + (p.num || '') + '|' + (hurt ? 1 : 0) + '|' + p.b5.O + p.b5.C + p.b5.E + p.b5.A + p.b5.N;
    let img = imgCache.get(key);
    if (img) return img;
    const svg = VB.spriteSVG(p, { team, accent, num: p.num, hurt }).replace('<svg ', '<svg width="100" height="160" ');
    img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    imgCache.set(key, img);
    return img;
  };
})();
