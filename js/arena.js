/* Vaultball Coach — the 3D arena (Three.js). Purely visual: the game runs without it. */
(function () {
  const VB = (globalThis.VB = globalThis.VB || {});
  const T = globalThis.THREE;
  const A = (VB.Arena = { ok: false });
  if (!T) return;

  let renderer, scene, camera, clock, floorMat;
  const tweens = [];
  const ours = [[], [], []], theirs = [[], [], []];
  let ball, hoopFar, hoopNear, commish, crowd, mode = 'table', camT = 0, shake = 0;
  let ourColor = 0x2de2e6, oppColor = 0xff3b6b;
  const LANE_X = [-6.5, 0, 6.5];
  const OUR_Z = [-3.5, 3, 9];      // STR, LNK, ANC
  const OPP_Z = [4.8, -1.2, -8.5]; // their STR (in our half), LNK, ANC
  const HOOP_Z = 15.5;

  function tween(dur, update, done) {
    return new Promise((res) => tweens.push({ t: 0, dur, update, done: () => { done && done(); res(); } }));
  }
  const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

  function courtTexture() {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 2048;
    const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 0, 2048); grd.addColorStop(0, '#0a0f1f'); grd.addColorStop(0.5, '#0d1428'); grd.addColorStop(1, '#0a0f1f');
    g.fillStyle = grd; g.fillRect(0, 0, 1024, 2048);
    // hex texture
    g.strokeStyle = 'rgba(80,140,255,0.05)'; g.lineWidth = 1;
    for (let y = 0; y < 2048; y += 34) for (let x = (y / 34) % 2 ? 0 : 20; x < 1024; x += 40) { g.beginPath(); g.arc(x, y, 14, 0, Math.PI * 2); g.stroke(); }
    // lane strips
    const lw = 1024 / 3;
    ['rgba(45,226,230,0.05)', 'rgba(255,255,255,0.02)', 'rgba(45,226,230,0.05)'].forEach((col, i) => { g.fillStyle = col; g.fillRect(i * lw, 0, lw, 2048); });
    g.shadowColor = '#2de2e6'; g.shadowBlur = 18; g.strokeStyle = '#2de2e6'; g.lineWidth = 6;
    g.strokeRect(14, 14, 996, 2020);
    g.lineWidth = 3; g.strokeStyle = 'rgba(45,226,230,0.55)';
    g.beginPath(); g.moveTo(lw, 20); g.lineTo(lw, 2028); g.moveTo(2 * lw, 20); g.lineTo(2 * lw, 2028); g.stroke();
    g.strokeStyle = '#ff3b9a'; g.shadowColor = '#ff3b9a'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(14, 1024); g.lineTo(1010, 1024); g.stroke();
    g.beginPath(); g.arc(512, 1024, 120, 0, Math.PI * 2); g.stroke();
    // vault arcs (3-point)
    g.strokeStyle = '#9b7bff'; g.shadowColor = '#9b7bff';
    g.beginPath(); g.arc(512, 40, 360, 0, Math.PI); g.stroke();
    g.beginPath(); g.arc(512, 2008, 360, Math.PI, 0); g.stroke();
    const tex = new T.CanvasTexture(c); tex.anisotropy = 4;
    return tex;
  }

  function numberSprite(text, color) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(5,8,20,0.75)'; g.beginPath(); g.arc(64, 64, 52, 0, Math.PI * 2); g.fill();
    g.strokeStyle = color; g.lineWidth = 6; g.stroke();
    g.fillStyle = '#fff'; g.font = 'bold 54px Orbitron, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 64, 68);
    const s = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false }));
    s.scale.set(1.5, 1.5, 1);
    return s;
  }

  function makeToken(color) {
    const grp = new T.Group();
    const mat = new T.MeshStandardMaterial({ color: 0x111827, emissive: color, emissiveIntensity: 0.55, metalness: 0.6, roughness: 0.35 });
    const body = new T.Mesh(new T.CapsuleGeometry(0.55, 1.3, 6, 12), mat); body.position.y = 1.2; grp.add(body);
    const visor = new T.Mesh(new T.BoxGeometry(0.7, 0.16, 0.2), new T.MeshBasicMaterial({ color: 0xffffff })); visor.position.set(0, 1.85, -0.45); grp.add(visor);
    const ring = new T.Mesh(new T.RingGeometry(0.8, 1.05, 32), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: T.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; grp.add(ring);
    grp.userData = { body, ring, mat, label: null, color, base: new T.Vector3() };
    return grp;
  }
  function setLabel(tok, text) {
    if (tok.userData.label) tok.remove(tok.userData.label);
    const s = numberSprite(String(text), '#' + tok.userData.color.toString(16).padStart(6, '0'));
    s.position.y = 3.0; tok.add(s); tok.userData.label = s;
  }

  function makeHoop(z, color) {
    const g = new T.Group();
    const pole = new T.Mesh(new T.CylinderGeometry(0.15, 0.25, 6, 12), new T.MeshStandardMaterial({ color: 0x222a44, metalness: 0.8, roughness: 0.3 }));
    pole.position.y = 3; g.add(pole);
    const ring = new T.Mesh(new T.TorusGeometry(1.3, 0.12, 12, 48), new T.MeshBasicMaterial({ color }));
    ring.position.y = 6.4; g.add(ring);
    const glow = new T.Mesh(new T.CircleGeometry(1.2, 32), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.12, side: T.DoubleSide }));
    glow.position.y = 6.4; g.add(glow);
    g.position.set(0, 0, z);
    g.userData = { ring, glow };
    return g;
  }

  function makeCommissioner() {
    const g = new T.Group();
    const holo = (geo, op) => new T.Mesh(geo, new T.MeshBasicMaterial({ color: 0xff2b55, transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false }));
    const wire = (geo, op) => new T.Mesh(geo, new T.MeshBasicMaterial({ color: 0xff5577, wireframe: true, transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false }));
    const head = new T.SphereGeometry(3.2, 24, 16);
    const h1 = holo(head, 0.08), h2 = wire(head, 0.12); h1.position.y = h2.position.y = 15; g.add(h1, h2);
    const torso = new T.CylinderGeometry(4.5, 9, 10, 20, 4, true);
    const t1 = holo(torso, 0.06), t2 = wire(torso, 0.08); t1.position.y = t2.position.y = 7; g.add(t1, t2);
    const hat = new T.CylinderGeometry(2.4, 2.6, 2.6, 20); const ht = wire(hat, 0.2); ht.position.y = 18.8; g.add(ht);
    const brim = new T.CylinderGeometry(4.6, 4.6, 0.2, 28); const br = wire(brim, 0.2); br.position.y = 17.5; g.add(br);
    const eyeM = new T.MeshBasicMaterial({ color: 0xffe0e6 });
    const e1 = new T.Mesh(new T.SphereGeometry(0.32, 12, 8), eyeM), e2 = e1.clone();
    e1.position.set(-1.1, 15.3, 2.9); e2.position.set(1.1, 15.3, 2.9); g.add(e1, e2);
    // hands resting on the far edge of the table
    const hand = new T.BoxGeometry(2.4, 0.8, 1.6);
    const l = wire(hand, 0.25), r = wire(hand, 0.25); l.position.set(-11, 1, 6); r.position.set(11, 1, 6); g.add(l, r);
    g.position.set(0, 0, -27);
    g.userData = { eyes: [e1, e2], eyeM, parts: [h1, h2, t1, t2] };
    return g;
  }

  function makeCrowd() {
    const n = 2600, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const palette = [new T.Color(0x2de2e6), new T.Color(0xff3b9a), new T.Color(0x9b7bff), new T.Color(0xffffff), new T.Color(0xffd23f)];
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1, tier = Math.floor(Math.random() * 10);
      pos[i * 3] = side * (13 + tier * 1.4 + Math.random() * 0.6);
      pos[i * 3 + 1] = 1 + tier * 1.05 + Math.random() * 0.4;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 40;
      const c = palette[Math.floor(Math.random() * palette.length)];
      const dim = 0.25 + Math.random() * 0.5;
      col[i * 3] = c.r * dim; col[i * 3 + 1] = c.g * dim; col[i * 3 + 2] = c.b * dim;
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
    return new T.Points(geo, new T.PointsMaterial({ size: 0.28, vertexColors: true, transparent: true, opacity: 0.9 }));
  }

  A.init = function (canvas) {
    try {
      renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false });
    } catch (e) { console.warn('WebGL unavailable', e); return false; }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setClearColor(0x04050c);
    scene = new T.Scene();
    scene.fog = new T.FogExp2(0x04050c, 0.018);
    camera = new T.PerspectiveCamera(48, 1, 0.1, 400);
    camera.position.set(0, 30, 30); camera.lookAt(0, 0, 2);
    clock = new T.Clock();

    scene.add(new T.AmbientLight(0x404060, 0.9));
    const hemi = new T.HemisphereLight(0x5b7cff, 0x110011, 0.6); scene.add(hemi);
    const s1 = new T.PointLight(0x2de2e6, 60, 60, 1.6); s1.position.set(-10, 14, 6); scene.add(s1);
    const s2 = new T.PointLight(0xff3b9a, 60, 60, 1.6); s2.position.set(10, 14, -6); scene.add(s2);

    floorMat = new T.MeshStandardMaterial({ map: courtTexture(), roughness: 0.55, metalness: 0.4, emissive: 0x0b1530, emissiveIntensity: 0.4 });
    const floor = new T.Mesh(new T.PlaneGeometry(21, 34), floorMat); floor.rotation.x = -Math.PI / 2; scene.add(floor);
    // the "table" — a dark slab the court sits on
    const slab = new T.Mesh(new T.BoxGeometry(27, 1.2, 40), new T.MeshStandardMaterial({ color: 0x0a0a14, roughness: 0.9, metalness: 0.2 }));
    slab.position.y = -0.62; scene.add(slab);
    const edge = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(27, 1.2, 40)), new T.LineBasicMaterial({ color: 0x2de2e6, transparent: true, opacity: 0.35 }));
    edge.position.y = -0.62; scene.add(edge);

    hoopFar = makeHoop(-HOOP_Z, 0x2de2e6); hoopNear = makeHoop(HOOP_Z, 0xff3b6b); scene.add(hoopFar, hoopNear);
    commish = makeCommissioner(); scene.add(commish);
    crowd = makeCrowd(); scene.add(crowd);

    for (let r = 0; r < 3; r++) for (let l = 0; l < 3; l++) {
      const a = makeToken(ourColor); a.position.set(LANE_X[l] - 0.9, 0, OUR_Z[r]); a.userData.base.copy(a.position); scene.add(a); ours[r][l] = a;
      const b = makeToken(oppColor); b.position.set(LANE_X[l] + 0.9, 0, OPP_Z[r]); b.rotation.y = Math.PI; b.userData.base.copy(b.position); scene.add(b); theirs[r][l] = b;
    }
    ball = new T.Mesh(new T.SphereGeometry(0.35, 16, 12), new T.MeshBasicMaterial({ color: 0xfff3a0 }));
    const bl = new T.PointLight(0xfff3a0, 6, 6); ball.add(bl);
    ball.position.set(0, 1, 0); scene.add(ball);

    window.addEventListener('resize', A.resize); A.resize();
    A.ok = true;
    A.setMode('table');
    renderer.setAnimationLoop(loop);
    return true;
  };

  A.resize = function () {
    if (!renderer) return;
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  };

  A.setMode = function (m) {
    mode = m;
    const showOpp = m === 'match';
    for (let r = 0; r < 3; r++) for (let l = 0; l < 3; l++) theirs[r][l].visible = showOpp;
    if (ball) ball.visible = m === 'match';
  };

  function loop() {
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.elapsedTime;
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i]; tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur); tw.update(k);
      if (k >= 1) { tweens.splice(i, 1); tw.done(); }
    }
    // camera
    camT += dt;
    let target, look;
    if (mode === 'table') { const a = Math.sin(camT * 0.08) * 0.35; target = new T.Vector3(Math.sin(a) * 34, 30, Math.cos(a) * 34); look = new T.Vector3(0, 0, 0); }
    else if (mode === 'title') { const a = camT * 0.05; target = new T.Vector3(Math.sin(a) * 30, 14, Math.cos(a) * 30); look = new T.Vector3(0, 4, -6); }
    else { const bx = ball ? ball.position.x * 0.25 : 0; target = new T.Vector3(bx, 17, 30); look = new T.Vector3(bx * 0.5, 0, -1); }
    camera.position.lerp(target, 0.03);
    if (shake > 0) { camera.position.x += (Math.random() - 0.5) * shake; camera.position.y += (Math.random() - 0.5) * shake; shake *= 0.9; if (shake < 0.01) shake = 0; }
    camera.lookAt(look);
    // idle bob
    for (let r = 0; r < 3; r++) for (let l = 0; l < 3; l++) {
      [ours[r][l], theirs[r][l]].forEach((tok, j) => { if (!tok.userData.busy) tok.userData.body.position.y = 1.2 + Math.sin(t * 2 + r * 1.3 + l * 0.7 + j) * 0.06; tok.userData.ring.rotation.z = t * 0.6; });
    }
    if (commish) {
      commish.position.y = Math.sin(t * 0.6) * 0.4;
      commish.rotation.y = Math.sin(t * 0.25) * 0.08;
      commish.userData.parts.forEach((p, i) => (p.material.opacity = (i % 2 ? 0.1 : 0.06) + Math.sin(t * 7 + i) * 0.015 + (commish.userData.speak ? 0.05 : 0)));
      const ei = commish.userData.speak ? 0.7 + Math.sin(t * 18) * 0.3 : 0.85 + Math.sin(t * 2) * 0.15;
      commish.userData.eyeM.color.setRGB(1, ei * 0.85, ei * 0.9);
    }
    if (crowd) crowd.material.opacity = 0.75 + Math.sin(t * 3) * 0.08;
    renderer.render(scene, camera);
  }

  A.speak = function (on) { if (commish) commish.userData.speak = on; };

  A.setTeams = function (oppHex, ourGrid, oppHexStr) {
    oppColor = oppHex;
    for (let r = 0; r < 3; r++) for (let l = 0; l < 3; l++) {
      const a = ours[r][l];
      const p = ourGrid && ourGrid[r][l];
      a.visible = !!p;
      if (p) setLabel(a, p.num);
      a.userData.body.rotation.z = 0; a.userData.mat.emissive.setHex(ourColor); a.position.copy(a.userData.base);
      const b = theirs[r][l];
      b.userData.mat.emissive.setHex(oppHex); b.userData.ring.material.color.setHex(oppHex); b.userData.color = oppHex;
      setLabel(b, VB.randInt ? VB.randInt(2, 99) : r * 3 + l);
      b.position.copy(b.userData.base);
    }
    hoopNear.userData.ring.material.color.setHex(oppHex);
    if (ball) ball.position.set(0, 1, 0);
  };
  A.setOurSlot = function (r, l, p) {
    const a = ours[r][l]; a.visible = !!p; if (p) { setLabel(a, p.num); a.userData.mat.emissive.setHex(ourColor); a.userData.body.rotation.z = 0; }
  };

  function arc(from, to, h, dur) {
    return tween(dur, (k) => {
      const e = ease(k);
      ball.position.lerpVectors(from, to, e);
      ball.position.y = from.y + (to.y - from.y) * e + Math.sin(Math.PI * e) * h;
    });
  }
  function hop(tok, dur) {
    tok.userData.busy = true;
    return tween(dur, (k) => (tok.userData.body.position.y = 1.2 + Math.sin(Math.PI * k) * 1.6), () => (tok.userData.busy = false));
  }
  function flashHoop(h, color) {
    const g = h.userData.glow; const c0 = g.material.color.getHex();
    g.material.color.setHex(color);
    return tween(0.5, (k) => (g.material.opacity = 0.12 + (1 - k) * 0.7), () => { g.material.color.setHex(c0); g.material.opacity = 0.12; });
  }

  // Animate one play. speed: 1 normal, 2 fast.
  A.play = async function (pl, speed) {
    if (!A.ok || mode !== 'match') return;
    const sp = speed || 1;
    if (pl.side === 'injury' || pl.side === 'knock') {
      const tok = ours[pl.row][pl.lane];
      tok.userData.mat.emissive.setHex(0xff2020); shake = pl.side === 'injury' ? 0.6 : 0.25;
      if (pl.side === 'injury') {
        await tween(0.6 / sp, (k) => (tok.userData.body.rotation.z = (Math.PI / 2.4) * ease(k)));
        await tween(0.5 / sp, () => {});
      } else {
        await tween(0.4 / sp, (k) => (tok.userData.body.position.x = Math.sin(k * 30) * 0.15));
        tok.userData.mat.emissive.setHex(ourColor);
      }
      return;
    }
    const us = pl.side === 'us';
    const grid = us ? ours : theirs;
    const lane = pl.lane;
    const shooterTok = grid[pl.shooterRow || 0][lane];
    const passerTok = grid[pl.shooterRow === 1 ? 0 : 1][lane];
    const hoop = us ? hoopFar : hoopNear;
    const start = (passerTok && passerTok.visible ? passerTok : shooterTok).position.clone(); start.y = 1.6;
    ball.position.copy(start);
    const sp1 = shooterTok.position.clone(); sp1.y = 1.6;
    if (passerTok && passerTok.visible && passerTok !== shooterTok) await arc(start, sp1, 1.2, 0.35 / sp);
    hop(shooterTok, 0.45 / sp);
    const rim = hoop.position.clone(); rim.y = 6.4;
    if (pl.made) {
      await arc(sp1, rim, 4, 0.55 / sp);
      flashHoop(hoop, us ? 0x2de2e6 : 0xff3b6b);
      if (us) shake = 0.15;
      const down = rim.clone(); down.y = 0.4;
      await arc(rim, down, 0, 0.2 / sp);
    } else {
      const miss = rim.clone(); miss.x += (Math.random() - 0.5) * 2.5; miss.y = 6.7;
      await arc(sp1, miss, 4, 0.55 / sp);
      const out = miss.clone(); out.z += us ? 3 : -3; out.y = 0.4; out.x += (Math.random() - 0.5) * 4;
      await arc(miss, out, 1.5, 0.3 / sp);
    }
  };
})();
