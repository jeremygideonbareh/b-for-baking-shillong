// The hero cake: Blender GLB driven by scroll progress (P.hero, P.slice, P.layers) — no tweens fight over it.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// crumb speckle for the sponge, from object-space value noise (the Blender mesh has no UVs)
function crumb(mat) {
  mat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vObjP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjP = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vObjP;
float h3(vec3 p){ p = fract(p*0.3183099+.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float n3(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
  return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
float c = n3(vObjP*38.0)*.6 + n3(vObjP*90.0)*.4;
diffuseColor.rgb *= .7 + .45*c;
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb*vec3(1.08,.9,.72), smoothstep(.6,.8,c));
float pore = smoothstep(.78,.86, n3(vObjP*140.0));
diffuseColor.rgb *= 1.0 - pore*.35;`);
  };
}

// buttercream: horizontal palette-knife ridges on the frosting (normal + tone), object-space
function buttercream(mat) {
  mat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vObjP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjP = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vObjP;
float bh(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float bn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(bh(i),bh(i+vec2(1,0)),f.x),mix(bh(i+vec2(0,1)),bh(i+vec2(1,1)),f.x),f.y); }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
float ang = atan(vObjP.z, vObjP.x);
float rid = bn(vec2(ang*2.2, vObjP.y*16.0)) * .65 + bn(vec2(ang*7.0, vObjP.y*42.0)) * .35;
normal = normalize(normal + vec3(0.0, (rid-.5)*.22, 0.0));`)
      .replace('#include <color_fragment>', `#include <color_fragment>
float ang2 = atan(vObjP.z, vObjP.x);
diffuseColor.rgb *= .965 + .05*bn(vec2(ang2*3.0, vObjP.y*20.0));`);
  };
}

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

export function initCake({ canvas, P, onProgress }) {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const dpr = Math.min(devicePixelRatio, coarse ? 1 : 1.5);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !coarse && dpr < 1.4, powerPreference: 'high-performance' });
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  const key = new THREE.DirectionalLight(0xfff1e0, 1.6); key.position.set(3, 5, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd6dc, 0.9); rim.position.set(-4, 2.5, -3); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xfff8ef, 0xe9cfc4, 0.55));

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  const root = new THREE.Group(); scene.add(root);      // position / scale
  const spin = new THREE.Group(); root.add(spin);        // rotation

  // soft contact shadow
  const sc = document.createElement('canvas'); sc.width = sc.height = 256;
  const g = sc.getContext('2d'); const grd = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  grd.addColorStop(0, 'rgba(58,36,25,.42)'); grd.addColorStop(1, 'rgba(58,36,25,0)'); g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.8; root.add(shadow);

  const parts = { layers: [], wedges: [], shell: [], top: [], deco: [], drip: [] };
  let lifted = [];
  const state = { x: 0, y: 4, s: 1, rot: 0, tilt: 0, wedge: 0, ex: 0, camY: 2, dist: 9, op: 1 };
  const physCache = {};
  const pointer = { x: 0, y: 0 };
  let VW = innerWidth, VH = innerHeight;
  addEventListener('pointermove', e => { pointer.x = e.clientX / VW - .5; pointer.y = e.clientY / VH - .5; }, { passive: true });

  let ready = false, visible = true, raf = 0, last = performance.now(), t = 0, frameNo = 0;
  const loader = new GLTFLoader();
  const draco = new DRACOLoader(); draco.setDecoderPath('vendor/jsm/libs/draco/gltf/'); draco.setDecoderConfig({ type: 'wasm' }); loader.setDRACOLoader(draco);
  const done = new Promise((resolve, reject) => {
    loader.load('assets/3d/cake.glb', gltf => {
      const model = gltf.scene;
      model.traverse(o => {
        if (!o.isMesh) return;
        const n = o.name;
        const mn = o.material.name || '';
        if (/Frosting|Drip|Cream|Berry/.test(mn)) {
          if (!physCache[mn]) {
            const src = o.material, drip = /Drip/.test(mn), jam = /Berry/.test(mn);
            physCache[mn] = new THREE.MeshPhysicalMaterial({ color: src.color, roughness: drip ? 0.22 : jam ? 0.18 : 0.42, sheen: jam || coarse ? 0 : 0.7, sheenRoughness: 0.5, sheenColor: new THREE.Color('#ffe9ec'), clearcoat: drip ? 0.7 : jam ? 0.9 : 0.08, clearcoatRoughness: jam ? 0.12 : 0.35, name: mn });
            if (/Frosting/.test(mn)) buttercream(physCache[mn]);
          }
          o.material = physCache[mn];
        }
        if (/Sponge/.test(mn) && !o.material.userData.crumb) { o.material.userData.crumb = 1; crumb(o.material); }
        if (mn === 'GoldLeaf') o.material = new THREE.MeshStandardMaterial({ color: '#e6bb62', metalness: 0.85, roughness: 0.22, emissive: '#8a5f1c', emissiveIntensity: 0.45, side: THREE.DoubleSide, name: mn });
        else if (/Gold/.test(mn)) { o.material.color.set('#b8863c'); o.material.metalness = 1; o.material.roughness = 0.3; }
        o.material.envMapIntensity = /Gold/.test(mn) ? 1.0 : 0.95;
        if (/^Shell/.test(n)) { const src = o.material; o.material = src.clone(); o.material.onBeforeCompile = src.onBeforeCompile; o.material.transparent = true; parts.shell.push(o); }
        const m = n.match(/^L(\d)_/);
        if (m) parts.layers.push({ o, i: +m[1], y0: o.position.y });
        if (/_wedge$/.test(n)) parts.wedges.push(o);
        if (/^Top_/.test(n)) parts.top.push(o);
        if (/^Deco_/.test(n)) parts.deco.push(o);
        if (/^Drip_/.test(n)) parts.drip.push(o);
        o.userData.base = o.position.clone();
      });
      lifted = [...parts.top, ...parts.deco, ...parts.drip];
      spin.add(model);
      const go = () => { ready = true; resolve(); };
      (renderer.compileAsync ? renderer.compileAsync(scene, camera) : Promise.resolve()).then(go, go);
    }, e => { if (e.total) onProgress?.(e.loaded / e.total); }, reject);
  });

  let lastW = 0, lastH = 0;
  function resize() {
    const w = innerWidth, h = innerHeight;
    VW = w;
    if (coarse && w === lastW && Math.abs(h - lastH) < 160) return;
    lastW = w; lastH = h; VH = h;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();

  function targets() {
    const mobile = VW < 760;
    const intro = P.intro, h = P.hero, s = P.slice, l = P.layers;
    // fit: narrow viewports see less width, so shrink the cake with the aspect ratio
    const fit = clamp(camera.aspect / 1.45, 0.36, 1);
    const heroX = mobile ? 0 : 1.5, heroY = mobile ? -1.0 : -0.2;
    const heroS = mobile ? 1.55 * fit : 0.95 * fit;
    const sliceIn = smooth(0, 0.18, s);
    const wedgeOut = smooth(0.1, 0.42, s) * (1 - smooth(0.0, 0.12, l));
    const ex = smooth(0.13, 0.4, l) * (1 - smooth(0.66, 0.88, l));
    const layerShift = smooth(0.05, 0.2, l) * (1 - smooth(0.82, 0.95, l));
    const endShrink = smooth(0.84, 0.96, l);
    let x = mix(heroX, 0, smooth(0, 1, h));
    x = mix(x, mobile ? -0.42 : -1.05, layerShift);
    let y = mix(heroY, mobile ? 0.2 : -0.25, smooth(0, 1, h)) + (1 - intro) * 4;
    y = mix(y, mobile ? -1.05 : -1.15, ex);
    y = mix(y, mobile ? 0.15 : 0, endShrink);
    let sc = mix(heroS, mobile ? 1.2 * fit : 0.8 * fit, smooth(0, 1, h)) * mix(1, mobile ? 1.05 : 0.78, ex);
    sc *= mix(1, mobile ? 0.85 : 0.72, endShrink);
    // hand-off: as the pink statement rises, the cake lifts away up and to the left
    const ext = smooth(0, 1, P.exit || 0);
    x = mix(x, mobile ? -0.4 : -2.4, ext); y += ext * 4.2; sc *= 1 - ext * 0.45;
    const osc = Math.sin(t * 0.45) * 0.35;
    let rot = osc + pointer.x * 0.35 + h * 1.2 + (1 - intro) * -3.2;
    const sliceRot = -0.55 + Math.sin(t * 0.4) * 0.06 + pointer.x * 0.15;
    const focus = sliceIn * (1 - smooth(0.02, 0.18, l));
    rot = mix(rot, sliceRot, focus);
    rot = mix(rot, -0.55 + (l - 0.15) * 1.4 + pointer.x * 0.2, smooth(0.02, 0.18, l));
    rot += smooth(0, 1, P.exit || 0) * 2.4;
    return {
      x, y, s: sc, rot,
      tilt: pointer.y * 0.08,
      wedge: wedgeOut, ex,
      camY: mix(2.1, 1.5, sliceIn) + ex * 0.5,
      dist: mix(9, 11.5, ex),
      op: 1,
    };
  }

  function apply() {
    root.position.set(state.x, state.y, 0);
    root.scale.setScalar(state.s);
    spin.rotation.set(state.tilt, state.rot, 0);
    camera.position.set(0, state.camY, state.dist);
    camera.lookAt(0, 0.35, 0);
    const e = state.ex, w = state.wedge;
    const mobileK = VW < 760 ? 0.85 : 1;
    for (const L of parts.layers) L.o.position.y = L.o.userData.base.y + L.i * e * 0.42 * mobileK;
    const topLift = 6 * 0.42 * e * mobileK + e * 0.55;
    for (const o of lifted) o.position.y = o.userData.base.y + topLift;
    for (const o of parts.shell) { o.position.y = o.userData.base.y + e * 3.4; o.material.opacity = 1 - smooth(0.15, 0.7, e); o.visible = o.material.opacity > 0.01; }
    // wedge slides out toward the viewer (+Z local) and drops a touch
    for (const o of parts.wedges) {
      o.position.z = o.userData.base.z + w * 1.05;
      o.position.x = o.userData.base.x;
      if (!/^Shell|^Top|^Drip/.test(o.name)) {/* layer wedge keeps its exploded y */}
    }
    for (const o of parts.wedges) if (/^Top|^Drip/.test(o.name)) o.position.z = o.userData.base.z + w * 1.05;
    shadow.material.opacity = 1 - e * 0.5;
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    frameNo++;
    if (!ready || !visible) return;
    const T = targets();
    const k = 1 - Math.exp(-dt * 7.5);
    for (const key in T) state[key] += (T[key] - state[key]) * k;
    apply();
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  // screen position of a named part's right edge (for labels)
  const v = new THREE.Vector3();
  const right = new THREE.Vector3();
  function project(name, dy = 0, side = 1.2) {
    let o = null;
    if (name === 'deco') o = parts.deco[0];
    else if (name === 'top') o = parts.top[0];
    else if (name === 'cream') o = parts.layers.find(L => L.i === 5)?.o;
    else if (name === 'jam') o = parts.layers.find(L => L.i === 4)?.o;
    else if (name === 'sponge') o = parts.layers.find(L => L.i === 3)?.o;
    if (!o) return null;
    if (project.frame !== frameNo) { root.updateMatrixWorld(); project.frame = frameNo; }
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const bb = o.geometry.boundingBox; const cy = (bb.min.y + bb.max.y) / 2;
    v.set(0, cy + dy, 0); o.localToWorld(v);
    right.set(1, 0, 0).applyQuaternion(camera.quaternion).multiplyScalar(side * state.s);
    v.add(right);
    v.project(camera);
    return { x: (v.x * 0.5 + 0.5) * VW, y: (-v.y * 0.5 + 0.5) * VH };
  }

  document.addEventListener('visibilitychange', () => { last = performance.now(); });
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); canvas.parentElement.classList.add('no-webgl'); });

  return {
    ready: done,
    get isReady() { return ready; },
    project,
    get ex() { return state.ex; },
    setVisible(vis) { visible = vis; },
  };
}
