/**
 * Ferula Art — Three.js Interactive Hero Particle Scene
 * Mandala-arranged particles with mouse ripple + glow shader
 */
(function () {
  if (typeof THREE === 'undefined') return;
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
  camera.position.z = 8;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const COUNT = 2200;
  const positions = new Float32Array(COUNT * 3);
  const aColors  = new Float32Array(COUNT * 3);
  const aSizes   = new Float32Array(COUNT);
  const aSpeeds  = new Float32Array(COUNT);
  const aPhases  = new Float32Array(COUNT);

  // Brand palette (linear sRGB)
  const palette = [
    [0.769, 0.631, 0.816], // purple  #c4a1d0
    [0.949, 0.776, 0.757], // peach   #f2c6c2
    [0.659, 0.835, 0.729], // mint    #a8d5ba
    [0.961, 0.851, 0.659], // tan     #f5d9a8
    [0.91,  0.706, 0.722], // rose    #e8b4b8
    [0.80,  0.70,  0.95],  // lavender
  ];

  for (let i = 0; i < COUNT; i++) {
    const ring  = Math.floor(Math.random() * 5);
    const angle = (i / COUNT) * Math.PI * 2 * (ring * 2 + 3) + ring * 0.7;
    const r     = 1.1 + ring * 0.95 + (Math.random() - 0.5) * 0.9;

    positions[i*3]   = Math.cos(angle) * r;
    positions[i*3+1] = Math.sin(angle) * r * 0.62;
    positions[i*3+2] = (Math.random() - 0.5) * 3.5;

    const c = palette[Math.floor(Math.random() * palette.length)];
    aColors[i*3]   = c[0];
    aColors[i*3+1] = c[1];
    aColors[i*3+2] = c[2];

    aSizes[i]  = Math.random() * 3.8 + 0.8;
    aSpeeds[i] = Math.random() * 0.45 + 0.12;
    aPhases[i] = Math.random() * Math.PI * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aColor',   new THREE.BufferAttribute(aColors, 3));
  geo.setAttribute('aSize',    new THREE.BufferAttribute(aSizes, 1));
  geo.setAttribute('aSpeed',   new THREE.BufferAttribute(aSpeeds, 1));
  geo.setAttribute('aPhase',   new THREE.BufferAttribute(aPhases, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime:  { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uPR:    { value: renderer.getPixelRatio() },
    },
    vertexShader: `
      attribute vec3  aColor;
      attribute float aSize;
      attribute float aSpeed;
      attribute float aPhase;
      varying vec3  vColor;
      varying float vAlpha;
      uniform float uTime;
      uniform vec2  uMouse;
      uniform float uPR;

      void main() {
        vColor = aColor;
        vec3 pos = position;
        float t = uTime * aSpeed + aPhase;

        // Organic floating motion
        pos.x += sin(t * 0.75 + pos.y * 0.4) * 0.20;
        pos.y += cos(t * 0.55 + pos.x * 0.3) * 0.16;
        pos.z += sin(t * 0.35 + aPhase)       * 0.10;

        // Mouse ripple
        vec2  m    = uMouse * 5.5;
        vec2  diff = pos.xy - m;
        float dist = length(diff);
        float wave = exp(-dist * 0.22) * sin(dist * 2.0 - uTime * 2.8) * 0.45;
        pos.xy += normalize(diff + 0.001) * wave;

        vAlpha = 0.50 + 0.28 * sin(t + aPhase * 0.5);

        vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = aSize * uPR * (290.0 / -mvPos.z);
        gl_Position  = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      varying vec3  vColor;
      varying float vAlpha;

      void main() {
        vec2  uv = gl_PointCoord - 0.5;
        float r  = dot(uv, uv);
        if (r > 0.25) discard;
        float glow = pow(1.0 - r * 4.0, 1.9);
        gl_FragColor = vec4(vColor, glow * vAlpha);
      }
    `,
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);

  // Second sparse layer for depth
  const COUNT2 = 600;
  const pos2   = new Float32Array(COUNT2 * 3);
  const col2   = new Float32Array(COUNT2 * 3);
  const sz2    = new Float32Array(COUNT2);
  const sp2    = new Float32Array(COUNT2);
  const ph2    = new Float32Array(COUNT2);
  for (let i = 0; i < COUNT2; i++) {
    pos2[i*3]   = (Math.random() - 0.5) * 16;
    pos2[i*3+1] = (Math.random() - 0.5) * 10;
    pos2[i*3+2] = (Math.random() - 0.5) * 6 - 2;
    const c = palette[Math.floor(Math.random() * palette.length)];
    col2[i*3] = c[0]; col2[i*3+1] = c[1]; col2[i*3+2] = c[2];
    sz2[i] = Math.random() * 1.8 + 0.4;
    sp2[i] = Math.random() * 0.2 + 0.05;
    ph2[i] = Math.random() * Math.PI * 2;
  }
  const geo2 = new THREE.BufferGeometry();
  geo2.setAttribute('position', new THREE.BufferAttribute(pos2, 3));
  geo2.setAttribute('aColor',   new THREE.BufferAttribute(col2, 3));
  geo2.setAttribute('aSize',    new THREE.BufferAttribute(sz2, 1));
  geo2.setAttribute('aSpeed',   new THREE.BufferAttribute(sp2, 1));
  geo2.setAttribute('aPhase',   new THREE.BufferAttribute(ph2, 1));
  const mat2 = mat.clone();
  mat2.uniforms = {
    uTime:  mat.uniforms.uTime,
    uMouse: mat.uniforms.uMouse,
    uPR:    mat.uniforms.uPR,
  };
  const points2 = new THREE.Points(geo2, mat2);
  scene.add(points2);

  // --- Events ---
  const mouse       = new THREE.Vector2(0, 0);
  const smoothMouse = new THREE.Vector2(0, 0);
  const clock       = new THREE.Clock();

  window.addEventListener('mousemove', e => {
    mouse.x =  (e.clientX / innerWidth)  * 2 - 1;
    mouse.y = -(e.clientY / innerHeight) * 2 + 1;
  });

  window.addEventListener('touchmove', e => {
    const t = e.touches[0];
    mouse.x =  (t.clientX / innerWidth)  * 2 - 1;
    mouse.y = -(t.clientY / innerHeight) * 2 + 1;
  }, { passive: true });

  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    mat.uniforms.uPR.value = renderer.getPixelRatio();
  });

  // Click burst
  window.addEventListener('click', e => {
    if (e.target.closest('a, button, input')) return;
    const bx = (e.clientX / innerWidth) * 2 - 1;
    const by = -(e.clientY / innerHeight) * 2 + 1;
    mouse.x = bx * 1.4;
    mouse.y = by * 1.4;
    setTimeout(() => { mouse.x = bx; mouse.y = by; }, 300);
  });

  // --- Render loop ---
  (function tick() {
    requestAnimationFrame(tick);
    const t = clock.getElapsedTime();
    mat.uniforms.uTime.value = t;
    smoothMouse.x += (mouse.x - smoothMouse.x) * 0.045;
    smoothMouse.y += (mouse.y - smoothMouse.y) * 0.045;
    mat.uniforms.uMouse.value.copy(smoothMouse);
    points.rotation.z  = t * 0.020;
    points2.rotation.z = t * -0.008;
    renderer.render(scene, camera);
  })();
})();
