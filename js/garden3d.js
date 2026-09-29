/**
 * ═══════════════════════════════════════════════════════════════
 * 精進花園 3D 核心渲染引擎 (garden3d.js)
 * 基於 Three.js 程序化幾何與材質建構（無外部龐大 3D 模型依賴，載入極速）
 * 特色：
 * 1. 禪意蓮池、白玉石台、青苔石、石燈籠與水波光影
 * 2. 5 階段智慧蓮花程序化生長 (幼苗 -> 含苞 -> 微綻 -> 盛開 -> 七寶金蓮)
 * 3. 晨曦 / 正午 / 晚霞 / 明月 四季天色切換
 * 4. Web Audio API 空靈頌缽鐘聲合成（免外部音檔）
 * 5. 他人花園參觀模式：嚴格隱私保護（僅顯示班級與法名）
 * ═══════════════════════════════════════════════════════════════
 */

let scene, camera, renderer, controls;
let lotusGroup, environmentGroup, particleSystem;
let sunLight, ambientLight, lotusPointLight, lanternLight;
let currentLotusLevel = 3; // 預設 3
let currentEnvMode = 'sunset'; // 'morning', 'noon', 'sunset', 'night'
let isAudioMuted = false;
let audioCtx = null;
let animationFrameId;

// 頁面初始化
document.addEventListener('DOMContentLoaded', () => {
  init3DScene();
  setupURLParameters();
  setupHUDControls();
  setupZenAudio();
  animate();
});

// 1. 初始化 Three.js 3D 場景
function init3DScene() {
  const container = document.getElementById('canvas-container');
  const width = window.innerWidth;
  const height = window.innerHeight;

  // 場景
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x1a211e, 0.025);

  // 相機
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(0, 7, 16);

  // 渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  // 控制器
  if (typeof THREE.OrbitControls !== 'undefined') {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // 避免沉入水底
    controls.minDistance = 4;
    controls.maxDistance = 35;
    controls.target.set(0, 2.2, 0);
  }

  // 建立群組
  lotusGroup = new THREE.Group();
  environmentGroup = new THREE.Group();
  scene.add(environmentGroup);
  scene.add(lotusGroup);

  // 燈光與環境
  buildLighting();
  buildZenEnvironment();
  buildLotusFlower(currentLotusLevel);
  buildFloatingParticles();

  // 監聽視窗縮放
  window.addEventListener('resize', onWindowResize);
}

// 2. 建立燈光與天色系統
function buildLighting() {
  ambientLight = new THREE.AmbientLight(0xfff4e6, 0.7);
  scene.add(ambientLight);

  sunLight = new THREE.DirectionalLight(0xffecd2, 1.4);
  sunLight.position.set(12, 20, 15);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 60;
  sunLight.shadow.bias = -0.0005;
  scene.add(sunLight);

  // 蓮花自體靈光
  lotusPointLight = new THREE.PointLight(0xffd700, 1.8, 12);
  lotusPointLight.position.set(0, 3, 0);
  scene.add(lotusPointLight);

  // 石燈籠微光
  lanternLight = new THREE.PointLight(0xffaa44, 1.2, 8);
  lanternLight.position.set(-6, 3.2, -4);
  scene.add(lanternLight);

  applyEnvironmentMode(currentEnvMode);
}

// 3. 建立禪意水池、白玉基座與石燈籠
function buildZenEnvironment() {
  // 水面 (青綠澄澈水波)
  const waterGeo = new THREE.CircleGeometry(26, 64);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x1d382f,
    roughness: 0.15,
    metalness: 0.85,
    transparent: true,
    opacity: 0.88
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0;
  water.receiveShadow = true;
  environmentGroup.add(water);

  // 池底圓環台
  const bedGeo = new THREE.CylinderGeometry(26.5, 27, 1.2, 48);
  const bedMat = new THREE.MeshStandardMaterial({ color: 0x141816, roughness: 0.9 });
  const bed = new THREE.Mesh(bedGeo, bedMat);
  bed.position.y = -0.6;
  environmentGroup.add(bed);

  // 中央白玉蓮花台基座
  const baseGeo = new THREE.CylinderGeometry(2.4, 2.8, 0.7, 32);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0xe8e4dc,
    roughness: 0.4,
    metalness: 0.1
  });
  const pedestal = new THREE.Mesh(baseGeo, baseMat);
  pedestal.position.y = 0.35;
  pedestal.receiveShadow = true;
  pedestal.castShadow = true;
  environmentGroup.add(pedestal);

  // 蓮台花瓣底座雕飾
  const rimGeo = new THREE.TorusGeometry(2.5, 0.22, 16, 48);
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xbfa77d, roughness: 0.3, metalness: 0.4 });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.65;
  environmentGroup.add(rim);

  // 漂浮荷葉群 (Lily pads)
  const padGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.05, 32);
  const padMat = new THREE.MeshStandardMaterial({
    color: 0x2d5a3f,
    roughness: 0.5,
    metalness: 0.1
  });

  const padPositions = [
    { x: -4.2, z: 2.5, scale: 0.9, rot: 0.2 },
    { x: 3.8, z: 3.2, scale: 1.1, rot: -0.4 },
    { x: -3.5, z: -3.2, scale: 1.2, rot: 0.8 },
    { x: 4.5, z: -2.8, scale: 0.85, rot: 1.2 },
    { x: 0.5, z: 5.2, scale: 0.95, rot: -0.6 }
  ];

  padPositions.forEach(p => {
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.set(p.x, 0.03, p.z);
    pad.scale.set(p.scale, 1, p.scale);
    pad.rotation.y = p.rot;
    pad.receiveShadow = true;
    environmentGroup.add(pad);
  });

  // 日式/中式禪風石燈籠
  buildStoneLantern(-6, 0, -4);
  buildStoneLantern(6.5, 0, -3.5, 0.85);

  // 禪意卵石群
  buildZenRocks();
}

// 建立石燈籠
function buildStoneLantern(x, y, z, scale = 1) {
  const lanternGroup = new THREE.Group();
  lanternGroup.position.set(x, y, z);
  lanternGroup.scale.set(scale, scale, scale);

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x5a5855, roughness: 0.85 });
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xffd27d });

  // 底座
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 0.4, 8), stoneMat);
  base.position.y = 0.2;
  lanternGroup.add(base);

  // 燈柱
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 1.8, 8), stoneMat);
  post.position.y = 1.2;
  lanternGroup.add(post);

  // 燈心托盤
  const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.6, 0.3, 8), stoneMat);
  tray.position.y = 2.2;
  lanternGroup.add(tray);

  // 火舍 (發光燈心)
  const fireCore = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.5), lightMat);
  fireCore.position.y = 2.65;
  lanternGroup.add(fireCore);

  // 火舍外窗柱
  const windowPost = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.7, 4, 1, true), stoneMat);
  windowPost.position.y = 2.65;
  lanternGroup.add(windowPost);

  // 笠 (屋頂)
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.6, 6), stoneMat);
  roof.position.y = 3.3;
  lanternGroup.add(roof);

  // 寶珠頂
  const jewel = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), stoneMat);
  jewel.position.y = 3.7;
  lanternGroup.add(jewel);

  environmentGroup.add(lanternGroup);
}

// 建立水池旁的景觀卵石
function buildZenRocks() {
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x484643, roughness: 0.8 });
  const rocks = [
    { x: -3, z: 4.8, r: 0.8, h: 0.6 },
    { x: -3.8, z: 5.2, r: 0.5, h: 0.4 },
    { x: 5.2, z: 4.0, r: 0.9, h: 0.7 },
    { x: 5.9, z: 3.5, r: 0.6, h: 0.5 },
    { x: -6.5, z: 2.0, r: 1.1, h: 0.9 }
  ];

  rocks.forEach(rk => {
    const rockGeo = new THREE.DodecahedronGeometry(rk.r, 1);
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.position.set(rk.x, rk.h * 0.4, rk.z);
    rock.scale.set(1, rk.h, 1.2);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true;
    rock.receiveShadow = true;
    environmentGroup.add(rock);
  });
}

// 4. 程序化建立智慧蓮花 (支援 5 階段生長)
function buildLotusFlower(level) {
  // 清空現有蓮花
  while (lotusGroup.children.length > 0) {
    const obj = lotusGroup.children[0];
    lotusGroup.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
  }

  const stemMat = new THREE.MeshStandardMaterial({ color: 0x3d704d, roughness: 0.6 });
  const stemHeight = 1.6 + level * 0.25;

  // 蓮莖
  const stemGeo = new THREE.CylinderGeometry(0.08, 0.12, stemHeight, 16);
  const stem = new THREE.Mesh(stemGeo, stemMat);
  stem.position.y = 0.65 + stemHeight / 2;
  stem.castShadow = true;
  lotusGroup.add(stem);

  const headY = 0.65 + stemHeight;

  if (level === 1) {
    // 階段 1：幼苗新芽 (Sprout)
    const leafGeo = new THREE.ConeGeometry(0.25, 0.7, 16);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x5cb85c, roughness: 0.4 });
    const leaf1 = new THREE.Mesh(leafGeo, leafMat);
    leaf1.position.set(0.12, headY + 0.2, 0);
    leaf1.rotation.z = -0.35;
    lotusGroup.add(leaf1);

    const leaf2 = new THREE.Mesh(leafGeo, leafMat);
    leaf2.position.set(-0.12, headY + 0.15, 0);
    leaf2.rotation.z = 0.45;
    lotusGroup.add(leaf2);

    // 水滴露珠
    const dewGeo = new THREE.SphereGeometry(0.07, 16, 16);
    const dewMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.85 });
    const dew = new THREE.Mesh(dewGeo, dewMat);
    dew.position.set(0.18, headY + 0.45, 0.05);
    lotusGroup.add(dew);

    lotusPointLight.intensity = 0.4;
    lotusPointLight.color.setHex(0x99ffaa);
  }
  else if (level === 2) {
    // 階段 2：初萌含苞 (Bud)
    const budMat = new THREE.MeshStandardMaterial({
      color: 0xdf7d93,
      roughness: 0.35,
      metalness: 0.1
    });

    const budGeo = new THREE.SphereGeometry(0.55, 24, 24);
    const bud = new THREE.Mesh(budGeo, budMat);
    bud.scale.set(0.7, 1.4, 0.7);
    bud.position.y = headY + 0.6;
    bud.castShadow = true;
    lotusGroup.add(bud);

    lotusPointLight.intensity = 0.8;
    lotusPointLight.color.setHex(0xffaacc);
  }
  else if (level === 3) {
    // 階段 3：微放清芬 (Semi-bloom)
    createLotusBloom(headY, 8, 0.7, false);
    lotusPointLight.intensity = 1.3;
    lotusPointLight.color.setHex(0xffd2a6);
  }
  else if (level === 4) {
    // 階段 4：盛開芙蕖 (Full bloom)
    createLotusBloom(headY, 16, 1.0, false);
    lotusPointLight.intensity = 2.0;
    lotusPointLight.color.setHex(0xffe6a3);
  }
  else if (level === 5) {
    // 階段 5：七寶金光祥蓮 (Grand Golden Lotus)
    createLotusBloom(headY, 24, 1.35, true);
    lotusPointLight.intensity = 3.2;
    lotusPointLight.color.setHex(0xffea75);

    // 金光法輪光環
    const auraGeo = new THREE.RingGeometry(2.2, 2.5, 48);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65
    });
    const aura = new THREE.Mesh(auraGeo, auraMat);
    aura.rotation.x = Math.PI / 2;
    aura.position.y = headY + 0.3;
    aura.name = "goldenAura";
    lotusGroup.add(aura);
  }

  // 平滑轉動展示
  lotusGroup.rotation.y = 0;
}

// 產生綻放蓮花花瓣與蓮蓬
function createLotusBloom(headY, petalCount, scale = 1, isGolden = false) {
  // 中央金黃蓮蓬
  const podGeo = new THREE.CylinderGeometry(0.55 * scale, 0.35 * scale, 0.5 * scale, 18);
  const podMat = new THREE.MeshStandardMaterial({
    color: isGolden ? 0xffcc00 : 0xe6a817,
    roughness: 0.3,
    metalness: isGolden ? 0.6 : 0.2
  });
  const pod = new THREE.Mesh(podGeo, podMat);
  pod.position.y = headY + 0.25 * scale;
  lotusGroup.add(pod);

  // 花蕊雄蕊圈 (Stamens)
  const stamenGeo = new THREE.TorusGeometry(0.65 * scale, 0.08 * scale, 12, 32);
  const stamenMat = new THREE.MeshStandardMaterial({ color: 0xfff066, roughness: 0.2 });
  const stamen = new THREE.Mesh(stamenGeo, stamenMat);
  stamen.rotation.x = Math.PI / 2;
  stamen.position.y = headY + 0.3 * scale;
  lotusGroup.add(stamen);

  // 花瓣材質
  const petalMat = new THREE.MeshStandardMaterial({
    color: isGolden ? 0xffd966 : 0xfae1e6,
    roughness: isGolden ? 0.25 : 0.4,
    metalness: isGolden ? 0.65 : 0.05,
    side: THREE.DoubleSide
  });

  // 第一層內花瓣 (直立微張)
  const innerCount = Math.min(8, petalCount);
  for (let i = 0; i < innerCount; i++) {
    const angle = (i / innerCount) * Math.PI * 2;
    const petal = createSinglePetal(scale * 0.9, petalMat);
    petal.position.set(
      Math.sin(angle) * 0.4 * scale,
      headY + 0.2 * scale,
      Math.cos(angle) * 0.4 * scale
    );
    petal.rotation.y = angle;
    petal.rotation.x = 0.45; // 微張
    lotusGroup.add(petal);
  }

  // 第二層外花瓣 (盛開舒展)
  if (petalCount > 8) {
    const outerCount = petalCount - innerCount;
    for (let i = 0; i < outerCount; i++) {
      const angle = (i / outerCount) * Math.PI * 2 + (Math.PI / outerCount);
      const petal = createSinglePetal(scale * 1.15, petalMat);
      petal.position.set(
        Math.sin(angle) * 0.7 * scale,
        headY + 0.1 * scale,
        Math.cos(angle) * 0.7 * scale
      );
      petal.rotation.y = angle;
      petal.rotation.x = 0.95; // 充分展開
      lotusGroup.add(petal);
    }
  }
}

// 建立單片蓮花花瓣幾何
function createSinglePetal(scale, material) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.35, 0.4, 0.45, 1.1, 0, 1.6);
  shape.bezierCurveTo(-0.45, 1.1, -0.35, 0.4, 0, 0);

  const extrudeSettings = {
    depth: 0.04 * scale,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: 0.02 * scale,
    bevelThickness: 0.02 * scale
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  const mesh = new THREE.Mesh(geo, material);
  mesh.scale.set(scale, scale, scale);
  mesh.castShadow = true;
  return mesh;
}

// 5. 飄浮功德光點與甘露花瓣粒子系統
function buildFloatingParticles() {
  const particleCount = 220;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const velocities = [];

  for (let i = 0; i < particleCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 16;
    positions[i + 1] = Math.random() * 9 + 0.5;
    positions[i + 2] = (Math.random() - 0.5) * 16;
    velocities.push({
      y: 0.005 + Math.random() * 0.015,
      angle: Math.random() * Math.PI * 2,
      speed: 0.003 + Math.random() * 0.005
    });
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  // 粒子材質
  const pMaterial = new THREE.PointsMaterial({
    color: 0xffe899,
    size: 0.18,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending
  });

  particleSystem = new THREE.Points(geometry, pMaterial);
  particleSystem.userData.velocities = velocities;
  scene.add(particleSystem);
}

// 6. 天候與光影調控 (晨曦 / 正午 / 晚霞 / 明月)
function applyEnvironmentMode(mode) {
  currentEnvMode = mode;
  document.querySelectorAll('.hud-env-controls button').forEach(b => {
    b.classList.remove('active');
    if (b.dataset.mode === mode) b.classList.add('active');
  });

  if (mode === 'morning') {
    scene.background = new THREE.Color(0xdce7e5);
    scene.fog.color = new THREE.Color(0xdce7e5);
    ambientLight.color.setHex(0xfff3e0);
    ambientLight.intensity = 0.85;
    sunLight.color.setHex(0xffe2b8);
    sunLight.position.set(16, 12, 12);
    sunLight.intensity = 1.3;
  }
  else if (mode === 'noon') {
    scene.background = new THREE.Color(0xecf2f0);
    scene.fog.color = new THREE.Color(0xecf2f0);
    ambientLight.color.setHex(0xffffff);
    ambientLight.intensity = 0.95;
    sunLight.color.setHex(0xfffaed);
    sunLight.position.set(5, 24, 8);
    sunLight.intensity = 1.6;
  }
  else if (mode === 'sunset') {
    scene.background = new THREE.Color(0x38282b);
    scene.fog.color = new THREE.Color(0x38282b);
    ambientLight.color.setHex(0xffb899);
    ambientLight.intensity = 0.65;
    sunLight.color.setHex(0xff7744);
    sunLight.position.set(22, 6, 8);
    sunLight.intensity = 1.5;
  }
  else if (mode === 'night') {
    scene.background = new THREE.Color(0x0c1214);
    scene.fog.color = new THREE.Color(0x0c1214);
    ambientLight.color.setHex(0x334455);
    ambientLight.intensity = 0.4;
    sunLight.color.setHex(0x88bbff);
    sunLight.position.set(-10, 18, -12);
    sunLight.intensity = 0.85;
  }
}

// 7. Web Audio API 空靈頌缽鐘聲合成 (免外載音檔，隨點即響)
function setupZenAudio() {
  const audioBtn = document.getElementById('btnZenSound');
  if (!audioBtn) return;

  audioBtn.addEventListener('click', () => {
    isAudioMuted = !isAudioMuted;
    if (!isAudioMuted) {
      audioBtn.innerHTML = '🔔 頌缽清音：開';
      playSingingBowlChime();
    } else {
      audioBtn.innerHTML = '🔕 頌缽清音：靜';
    }
  });
}

function playSingingBowlChime(freq = 288) {
  if (isAudioMuted) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    // 泛音層次
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now); // 基礎音 (F# / D / 288Hz)

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2.76, now); // 空靈泛音

    // 音量包絡線 (擊缽後悠長漸隱)
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.35, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 6.5);

    gain2.gain.setValueAtTime(0.0001, now);
    gain2.gain.exponentialRampToValueAtTime(0.12, now + 0.04);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 4.5);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 6.8);
    osc2.stop(now + 4.8);
  } catch (err) {
    console.warn("Audio Context init blocked until user interaction", err);
  }
}

// 8. 讀取 URL 參數 (判定是查看「我的花園」或「參觀他人花園」)
async function setupURLParameters() {
  const params = new URLSearchParams(window.location.search);
  const isVisitor = params.get('visitor') === '1';
  const studentId = params.get('id');

  const titleEl = document.getElementById('hudGardenTitle');
  const classEl = document.getElementById('hudOwnerClass');
  const dharmaEl = document.getElementById('hudOwnerDharma');
  const rejoiceBtnCard = document.getElementById('hudRejoiceCard');
  const levelTextEl = document.getElementById('hudLevelName');
  const checkinCountEl = document.getElementById('hudCheckinCount');

  if (isVisitor && studentId) {
    // 參觀他人花園模式：嚴格隱私過濾，只顯示班級與法名
    const res = await ZenAPI.getVisitedGardenDetail(studentId);
    if (res.success && res.garden) {
      const g = res.garden;
      if (titleEl) titleEl.textContent = `共修花園 · 【${g.class_type}】${g.dharma_name}`;
      if (classEl) classEl.textContent = g.class_type;
      if (dharmaEl) dharmaEl.textContent = g.dharma_name;
      if (rejoiceBtnCard) rejoiceBtnCard.style.display = 'block';

      currentLotusLevel = g.lotus_level || 3;
      buildLotusFlower(currentLotusLevel);
      updateGrowthUI(currentLotusLevel, g.total_checkins);

      // 設置隨喜按鈕事件
      const rCountEl = document.getElementById('hudRejoiceCount');
      if (rCountEl) rCountEl.textContent = g.rejoice_count || 0;
      
      const rActionBtn = document.getElementById('btnDoRejoice');
      if (rActionBtn) {
        rActionBtn.onclick = async () => {
          const rep = await ZenAPI.rejoiceGarden(g.id);
          if (rep.success) {
            if (rCountEl) rCountEl.textContent = rep.new_rejoice_count;
            playSingingBowlChime(432); // 隨喜讚嘆高雅法音
            triggerLotusFloatAnim();
          }
        };
      }
      return;
    }
  }

  // 預設我的花園模式
  const currStudentStr = localStorage.getItem(API_CONFIG.storageKeys.currentStudent);
  if (currStudentStr) {
    const s = JSON.parse(currStudentStr);
    if (titleEl) titleEl.textContent = `我的精進花園 · ${s.dharma_name || s.real_name}`;
    if (classEl) classEl.textContent = s.class_type;
    if (dharmaEl) dharmaEl.textContent = s.dharma_name || s.real_name;
    currentLotusLevel = s.lotus_level || 2;
    buildLotusFlower(currentLotusLevel);
    updateGrowthUI(currentLotusLevel, s.total_checkins);
  } else {
    // 尚未打卡預設範本
    if (titleEl) titleEl.textContent = `精進花園 · 菩提道場`;
    if (classEl) classEl.textContent = '日高';
    if (dharmaEl) dharmaEl.textContent = '傳心';
    currentLotusLevel = 3;
    buildLotusFlower(currentLotusLevel);
    updateGrowthUI(3, 15);
  }

  if (rejoiceBtnCard) rejoiceBtnCard.style.display = 'none'; // 本人花園無需對自己隨喜
}

// 9. 更新 HUD 成長階段顯示與點擊預覽
function updateGrowthUI(level, checkinCount) {
  const levelNames = [
    "一階：初萌幼苗（種子破土）",
    "二階：含苞凝萃（靜坐養心）",
    "三階：微放清芬（正念現前）",
    "四階：盛開芙蕖（定慧等持）",
    "五階：七寶金光（圓滿自性）"
  ];

  const levelTextEl = document.getElementById('hudLevelName');
  const countEl = document.getElementById('hudCheckinCount');
  if (levelTextEl) levelTextEl.textContent = levelNames[level - 1] || levelNames[0];
  if (countEl && checkinCount !== undefined) countEl.textContent = `累積精進 ${checkinCount} 次`;

  document.querySelectorAll('.step-dot').forEach(dot => {
    dot.classList.remove('active');
    if (parseInt(dot.dataset.step) === level) dot.classList.add('active');
  });
}

function setupHUDControls() {
  // 成長階段切換點
  document.querySelectorAll('.step-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const step = parseInt(dot.dataset.step);
      currentLotusLevel = step;
      buildLotusFlower(step);
      updateGrowthUI(step);
      playSingingBowlChime(260 + step * 35);
    });
  });

  // 天色切換按鈕
  document.querySelectorAll('.hud-env-controls button').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      applyEnvironmentMode(mode);
    });
  });
}

// 隨喜讚嘆飄花特效
function triggerLotusFloatAnim() {
  const container = document.body;
  for (let i = 0; i < 7; i++) {
    const flower = document.createElement('div');
    flower.className = 'floating-petal-effect';
    flower.textContent = ['🌸', '✨', '🪷', '🙏', '💫'][Math.floor(Math.random() * 5)];
    flower.style.left = `${window.innerWidth / 2 + (Math.random() - 0.5) * 200}px`;
    flower.style.top = `${window.innerHeight / 2 + (Math.random() - 0.5) * 100}px`;
    container.appendChild(flower);
    setTimeout(() => flower.remove(), 2100);
  }
}

// 10. 動畫主循環
function animate() {
  animationFrameId = requestAnimationFrame(animate);

  if (controls) controls.update();

  // 蓮花自轉微風搖曳
  if (lotusGroup) {
    const time = Date.now() * 0.001;
    lotusGroup.rotation.y += 0.0025;
    lotusGroup.position.y = Math.sin(time * 1.5) * 0.03; // 微浮水面
  }

  // 七寶光環自轉
  const aura = scene.getObjectByName('goldenAura');
  if (aura) {
    aura.rotation.z += 0.008;
  }

  // 粒子飄浮
  if (particleSystem) {
    const positions = particleSystem.geometry.attributes.position.array;
    const vels = particleSystem.userData.velocities;
    for (let i = 0; i < vels.length; i++) {
      const idx = i * 3;
      positions[idx + 1] += vels[i].y;
      positions[idx] += Math.sin(vels[i].angle) * vels[i].speed;

      // 重置高度
      if (positions[idx + 1] > 9.5) {
        positions[idx + 1] = 0.5;
      }
    }
    particleSystem.geometry.attributes.position.needsUpdate = true;
  }

  renderer.render(scene, camera);
}

function onWindowResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
