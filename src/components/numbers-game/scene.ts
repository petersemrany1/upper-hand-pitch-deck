import * as THREE from "three";
import type { Town, Tone } from "./model";

/**
 * The operations map: the business as an industrial water network, drawn
 * with three.js. Four districts on concrete plinths under cinematic light.
 *
 *   Acquisition   - one steel reservoir per ad; the sight-glass shows leads
 *   Depot         - the advisors' service vans, each with an excavation site
 *                   that works while they're online
 *   Clinics       - a clinic block per partner with a storage tank filling
 *                   against its pack
 *   Finance       - the meter house, with a spill per city losing money
 *
 * Alarms burn (ember flames, smoke, a flickering light). Performers get a
 * slow gold halo. Everything clickable carries userData = { kind, id }.
 */

export type PickKind = "tower" | "bay" | "tank" | "puddle" | "depot" | "meter" | "pump";
export type PickTarget = { kind: PickKind; id: string };
export type LabelSpec = { key: string; x: number; y: number; short: string; title: string; sub: string; tone: Tone; hidden: boolean; active: boolean; kind: PickKind };

type Opts = { onPick?: (t: PickTarget | null) => void; onLabels?: (labels: LabelSpec[]) => void };

const P = {
  bg: 0x11151b, ground: 0x20262d, plinth: 0x2c333b, plinthTop: 0x3f4851, kerb: 0x58626c, line: 0x505a65,
  concrete: 0x59636d, steel: 0x9aa6b2, steelDark: 0x66727e, gunmetal: 0x46505a, navy: 0x1f3350, navyLight: 0x2b476d,
  glass: 0x9fb4c6, water: 0x2d7fb8, waterGlow: 0x4fb3ff, pipe: 0x6b7680, flange: 0x4b555f,
  roof: 0x333b44, door: 0x20262d, van: 0xd9dde2, vanDark: 0x2b3138, tyre: 0x1a1d21,
  amber: 0xd99a3a, red: 0xc0453a, teal: 0x2f9d8f, gold: 0xc9a227, grey: 0x6e7986,
  dirt: 0x4d3a2a, trench: 0x1d1712, barrier: 0xd97b2b, ember: 0xff7a1f, smoke: 0x1b1f24,
};
const TONE_COL: Record<Tone, number> = { red: P.red, amber: P.amber, green: P.teal, grey: P.grey };
// 35° elevation, 45° azimuth
const CAM_OFFSET = new THREE.Vector3(58, 57, 58);

// ---------------------------------------------------------------- textures
const texCache = new Map<string, THREE.Texture>();
function canvasTex(key: string, size: number, draw: (g: CanvasRenderingContext2D, s: number) => void, repeat = 1): THREE.Texture {
  const hit = texCache.get(key); if (hit) return hit;
  const c = document.createElement("canvas"); c.width = c.height = size;
  const g = c.getContext("2d")!; draw(g, size);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  texCache.set(key, t); return t;
}
function noise(g: CanvasRenderingContext2D, s: number, base: string, amount: number) {
  g.fillStyle = base; g.fillRect(0, 0, s, s);
  const img = g.getImageData(0, 0, s, s); const d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * amount; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, 0, 0);
}
const concreteTex = () => canvasTex("concrete", 256, (g, s) => { noise(g, s, "#d9dde2", 30); g.strokeStyle = "rgba(0,0,0,0.25)"; g.lineWidth = 2; g.strokeRect(1, 1, s - 2, s - 2); g.strokeStyle = "rgba(255,255,255,0.05)"; g.beginPath(); g.moveTo(s / 2, 0); g.lineTo(s / 2, s); g.moveTo(0, s / 2); g.lineTo(s, s / 2); g.stroke(); }, 6);
const asphaltTex = () => canvasTex("asphalt", 256, (g, s) => noise(g, s, "#d3d7db", 26), 8);
const steelTex = () => canvasTex("steel", 128, (g, s) => { noise(g, s, "#e2e6ea", 16); for (let x = 0; x < s; x += 3) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`; g.fillRect(x, 0, 1, s); } }, 2);
const roofTex = () => canvasTex("roof", 128, (g, s) => { noise(g, s, "#dde1e5", 14); for (let x = 0; x < s; x += 16) { g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(x, 0, 2, s); g.fillStyle = "rgba(255,255,255,0.05)"; g.fillRect(x + 8, 0, 1, s); } }, 3);
const flameTex = () => canvasTex("flame", 128, (g, s) => { const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); r.addColorStop(0, "rgba(255,240,200,1)"); r.addColorStop(0.25, "rgba(255,150,40,0.9)"); r.addColorStop(0.6, "rgba(220,60,20,0.35)"); r.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = r; g.fillRect(0, 0, s, s); });
const smokeTex = () => canvasTex("smoke", 128, (g, s) => { const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); r.addColorStop(0, "rgba(40,44,50,0.55)"); r.addColorStop(1, "rgba(40,44,50,0)"); g.fillStyle = r; g.fillRect(0, 0, s, s); });
const glowTex = () => canvasTex("glow", 128, (g, s) => { const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); r.addColorStop(0, "rgba(255,255,255,0.9)"); r.addColorStop(0.4, "rgba(255,255,255,0.25)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, s, s); });

function panelText(text: string, o: { w: number; h: number; font?: number; color?: string; bg?: string; mono?: boolean }) {
  const scale = 28;
  const c = document.createElement("canvas"); c.width = Math.round(o.w * scale); c.height = Math.round(o.h * scale);
  const g = c.getContext("2d")!;
  g.fillStyle = o.bg ?? "#0d1116"; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = "rgba(255,255,255,0.12)"; g.lineWidth = 2; g.strokeRect(1, 1, c.width - 2, c.height - 2);
  g.fillStyle = o.color ?? "#7fd3ff"; g.textAlign = "center"; g.textBaseline = "middle";
  const px = (o.font ?? o.h * 0.5) * scale;
  g.font = `600 ${px}px ${o.mono ? "ui-monospace, Menlo, monospace" : "-apple-system, Inter, Helvetica, Arial, sans-serif"}`;
  const lines = text.split("\n");
  lines.forEach((ln, i) => g.fillText(ln, c.width / 2, c.height / 2 + (i - (lines.length - 1) / 2) * px * 1.2));
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return new THREE.Mesh(new THREE.PlaneGeometry(o.w, o.h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
}

const std = (color: number, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.15, ...o });
const steelMat = (color = P.steel) => std(color, { roughness: 0.42, metalness: 0.75, map: steelTex() });
const emissive = (color: number, intensity = 1.6) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4, metalness: 0 });

type Fill = { water: THREE.Mesh; target: number; maxH: number; base: number };
type Fire = { group: THREE.Group; flames: THREE.Sprite[]; smoke: THREE.Sprite[]; light: THREE.PointLight; size: number };
type Halo = { ring: THREE.Mesh; glow: THREE.Sprite; phase: number };
type Dig = { site: THREE.Vector3; boom: THREE.Group; bucket: THREE.Group; clods: { mesh: THREE.Mesh; v: THREE.Vector3; life: number }[]; active: boolean; nextClod: number };
type Van = { group: THREE.Group; bay: THREE.Vector3; site: THREE.Vector3; rot: number; busy: boolean };
type Trip = { van: Van; curve: THREE.CatmullRomCurve3; t: number; speed: number; phase: "out" | "drop" | "back"; clinicId: string; crate: THREE.Mesh | null; dropT: number; puffs: number };
type Puff = { s: THREE.Sprite; life: number };
type Pulse = { mesh: THREE.Mesh; curve: THREE.Curve<THREE.Vector3>; t: number; speed: number };

export class TownScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.OrthographicCamera;
  private container: HTMLElement;
  private opts: Opts;
  private raf = 0;
  private clock = new THREE.Clock();
  private town = new THREE.Group();
  private scenery = new THREE.Group();
  private fx = new THREE.Group();
  private pickables: THREE.Object3D[] = [];
  private pulses: Pulse[] = [];
  private fills: Fill[] = [];
  private tankFills = new Map<string, Fill>();
  private tankPanels = new Map<string, THREE.Group>();
  private fires: Fire[] = [];
  private halos: Halo[] = [];
  private digs: Dig[] = [];
  private vans = new Map<string, Van>();
  private trips: Trip[] = [];
  private puffs: Puff[] = [];
  private tankPos = new Map<string, THREE.Vector3>();
  private roadZ = 34;
  private clinicRoadX = 0;
  private labelAnchors: { key: string; pos: THREE.Vector3; short: string; title: string; sub: string; tone: Tone; kind: PickKind }[] = [];
  private hovered: THREE.Object3D | null = null;
  private sun: THREE.DirectionalLight;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(-2, -2);
  private disposed = false;
  private zoom = 1;
  private zoomTarget = 1;
  private baseFs = 60;
  private center = new THREE.Vector3();

  constructor(container: HTMLElement, opts: Opts = {}) {
    this.container = container;
    this.opts = opts;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = "block";

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -400, 800);
    this.camera.position.copy(CAM_OFFSET); this.camera.lookAt(0, 0, 0);

    this.scene.background = new THREE.Color(P.bg);
    this.scene.fog = new THREE.Fog(P.bg, 260, 520);
    this.scene.add(new THREE.HemisphereLight(0x9db0c4, 0x1e242b, 1.35));
    this.scene.add(new THREE.AmbientLight(0x9fb2c6, 0.45));
    this.sun = new THREE.DirectionalLight(0xffe7cf, 2.6);
    this.sun.position.set(70, 95, 25);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    Object.assign(this.sun.shadow.camera, { left: -220, right: 220, top: 220, bottom: -220, near: 1, far: 500 });
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.02; this.sun.shadow.radius = 3;
    this.scene.add(this.sun);
    const rim = new THREE.DirectionalLight(0x6fa8ff, 0.5); rim.position.set(-60, 40, -80); this.scene.add(rim);
    this.scene.add(this.town, this.scenery, this.fx);
    this.buildGround();

    this.renderer.domElement.addEventListener("pointermove", this.onMove);
    this.renderer.domElement.addEventListener("click", this.onClick);
    window.addEventListener("resize", this.resize);
    this.resize();
    this.loop();
  }

  // ======================================================== public
  setTown(town: Town) {
    this.clearTown();
    this.setNight(town.hour < 7 || town.hour >= 19);
    const T = this.town;

    // ================= ACQUISITION DISTRICT: reservoirs
    const aq = { x: -100, z: -44, w: 62, d: 84 };
    this.plinth(aq.x, aq.z, aq.w, aq.d, "ACQUISITION");
    const manifoldX = aq.x + aq.w + 6;
    town.towers.forEach((tw, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = aq.x + 16 + col * 30, z = aq.z + 18 + row * 30;
      const g = new THREE.Group(); g.position.set(x, 0.6, z);
      const r = 6, h = 9 + tw.fill * 3;
      g.add(this.cylinder(r + 1.2, 0.8, P.concrete, 0, 0, 0, { map: concreteTex() }));
      const shell = this.cylinder(r, h, P.steel, 0, 0.8, 0, {}, true); g.add(shell);
      for (const y of [0.25, 0.5, 0.75]) g.add(this.ring(r + 0.08, 0.14, P.steelDark, 0, 0.8 + h * y, 0));
      g.add(this.cylinder(r + 0.1, 0.5, P.steelDark, 0, 0.8 + h, 0));
      const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), steelMat(P.steelDark)); dome.scale.y = 0.35; dome.position.y = 0.8 + h + 0.5; dome.castShadow = true; g.add(dome);
      // catwalk and ladder
      g.add(this.ring(r + 1.1, 0.12, P.gunmetal, 0, 0.8 + h - 0.6, 0)); g.add(this.ring(r + 1.1, 0.06, P.gunmetal, 0, 0.8 + h + 0.4, 0));
      for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.add(this.box(0.08, 1.1, 0.08, P.gunmetal, Math.cos(a) * (r + 1.1), 0.8 + h - 0.6, Math.sin(a) * (r + 1.1))); }
      g.add(this.box(0.9, h, 0.15, P.gunmetal, r + 0.55, 0.8, 0)); for (let k = 0; k < Math.floor(h / 0.7); k++) g.add(this.box(0.9, 0.06, 0.3, P.steel, r + 0.55, 0.8 + 0.35 + k * 0.7, 0));
      // sight-glass: leads level
      g.add(this.box(0.9, h - 1, 0.5, P.gunmetal, -r * 0.72, 1.3, r * 0.72));
      const glass = this.box(0.5, h - 1.4, 0.3, P.glass, -r * 0.72, 1.5, r * 0.72 + 0.2, { transparent: true, opacity: 0.35, roughness: 0.1, metalness: 0 }); g.add(glass);
      const level = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.01, 0.22), emissive(P.waterGlow, 1.8)); level.position.set(-r * 0.72, 1.5, r * 0.72 + 0.22); g.add(level);
      this.fills.push({ water: level, target: Math.max(0.04, tw.fill), maxH: h - 1.5, base: 1.5 });
      // supply pipe to the manifold
      this.pipe([[x + r, 1.4, z], [manifoldX, 1.4, z], [manifoldX, 1.4, aq.z + aq.d / 2]], 0.6);
      g.add(this.disc(r + 1.6, TONE_COL[tw.tone], 0, 0, 0.42, { transparent: true, opacity: tw.tone === "grey" ? 0 : 0.35 }));
      this.tag(g, { kind: "tower", id: tw.id }); T.add(g);
      if (tw.fire) this.addFire(new THREE.Vector3(x, 0.8 + h + 2.2, z), 2.4);
      if (tw.star) this.addHalo(new THREE.Vector3(x, 0.62, z), r + 2.2);
      this.labelAnchors.push({ key: `tower:${tw.id}`, pos: new THREE.Vector3(x, 0.8 + h + (tw.fire ? 9 : 4.4), z), short: tw.name.replace(/hair transplant/i, "").trim() || tw.name, title: tw.name, sub: tw.note, tone: tw.tone, kind: "tower" });
    });
    // manifold + pump station + trunk
    const manifoldZ = aq.z + aq.d / 2;
    const pumpPos = new THREE.Vector3(manifoldX + 10, 0.6, manifoldZ);
    const pump = new THREE.Group(); pump.position.copy(pumpPos);
    pump.add(this.box(12, 6, 9, P.concrete, 0, 0, 0, { map: concreteTex() }));
    pump.add(this.box(12.6, 0.5, 9.6, P.roof, 0, 6, 0, { map: roofTex() }));
    pump.add(this.box(3.2, 3.2, 0.3, P.door, 0, 0, 4.6));
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.2, 10, 40), steelMat(P.red)); wheel.position.set(-4.2, 3.2, 4.7); pump.add(wheel);
    pump.add(this.box(0.25, 3, 0.25, P.red, -4.2, 1.7, 4.7)); pump.add(this.box(3, 0.25, 0.25, P.red, -4.2, 3.1, 4.7));
    const gauge = panelText("PSI 42", { w: 3.4, h: 1.4, font: 0.7, mono: true }); gauge.position.set(3.4, 3.4, 4.66); pump.add(gauge);
    const pumpLamp = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), emissive(town.pump.fire ? P.red : P.teal, 2.2)); pumpLamp.position.set(0, 6.9, 0); pump.add(pumpLamp);
    this.tag(pump, { kind: "pump", id: "pump" }); T.add(pump);
    if (town.pump.fire) this.addFire(new THREE.Vector3(pumpPos.x, 7.4, pumpPos.z), 2);
    this.labelAnchors.push({ key: "pump:pump", pos: new THREE.Vector3(pumpPos.x, town.pump.fire ? 14 : 9, pumpPos.z), short: "Pump station", title: "PUMP STATION · automations", sub: town.pump.note, tone: town.pump.fire ? "red" : "grey", kind: "pump" });

    // ================= DEPOT DISTRICT
    const nb = Math.max(1, town.bays.length);
    const dp = { x: -20, z: -44, w: 20 + nb * 16, d: 84 };
    this.plinth(dp.x, dp.z, dp.w, dp.d, "SALES DEPOT");
    const trunk = this.pipe([[pumpPos.x + 6, 1.4, manifoldZ], [dp.x - 4, 1.4, manifoldZ], [dp.x - 4, 1.4, dp.z + 18], [dp.x + 4, 1.4, dp.z + 18]], 0.8);
    for (let i = 0; i < Math.max(2, Math.min(12, Math.round(town.towers.reduce((s, t) => s + t.leads, 0) / 10))); i++) this.addPulse(trunk, i / 12, 0.05);
    const depotW = dp.w - 10, depotD = 22, depotCx = dp.x + dp.w / 2, depotCz = dp.z + 22;
    const depot = new THREE.Group(); depot.position.set(depotCx, 0.6, depotCz);
    depot.add(this.box(depotW, 9, depotD, P.concrete, 0, 0, 0, { map: concreteTex() }));
    depot.add(this.box(depotW + 0.8, 0.6, depotD + 0.8, P.roof, 0, 9, 0, { map: roofTex() }));
    for (let i = 0; i < Math.floor(depotW / 8); i++) depot.add(this.box(5, 0.5, 3, P.glass, -depotW / 2 + 6 + i * 8, 9.6, -3, { transparent: true, opacity: 0.55, roughness: 0.15, metalness: 0.2, emissive: town.depotOpen ? 0x9fc9ff : 0x000000, emissiveIntensity: 0.25 }));
    depot.add(this.box(depotW + 0.8, 1.6, 0.4, P.navy, 0, 7.2, depotD / 2 + 0.3));
    const depotSign = panelText("SALES DEPOT", { w: 14, h: 1.3, font: 0.8, color: "#e6ebf0", bg: "#1f3350" }); depotSign.position.set(0, 7.95, depotD / 2 + 0.55); depot.add(depotSign);
    town.bays.forEach((b, i) => {
      const bx = -depotW / 2 + 8 + i * 16;
      depot.add(this.box(7, 6, 0.4, P.door, bx, 0, depotD / 2 + 0.05));
      for (let k = 1; k < 6; k++) depot.add(this.box(7, 0.06, 0.1, P.steelDark, bx, k, depotD / 2 + 0.3));
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 0.3), emissive(b.inSession ? P.teal : P.grey, b.inSession ? 2 : 0.3)); lamp.position.set(bx, 6.6, depotD / 2 + 0.3); depot.add(lamp);
    });
    this.tag(depot, { kind: "depot", id: "depot" }); T.add(depot);
    this.labelAnchors.push({ key: "depot", pos: new THREE.Vector3(depotCx, 13, depotCz - 4), short: "Depot", title: "SALES DEPOT", sub: `${town.yardLeads.toLocaleString()} leads in the yard`, tone: "grey", kind: "depot" });
    this.roadZ = dp.z + dp.d + 8;

    town.bays.forEach((b, i) => {
      const bx = depotCx - depotW / 2 + 8 + i * 16;
      const bayPos = new THREE.Vector3(bx, 0.6, depotCz + depotD / 2 + 7);
      const sitePos = new THREE.Vector3(bx, 0.6, depotCz + depotD / 2 + 26);
      T.add(this.disc(4.6, TONE_COL[b.tone], bayPos.x, bayPos.z, 0.63, { transparent: true, opacity: b.tone === "grey" ? 0.12 : 0.35 }));
      const van = this.makeVan(b.fire ? P.red : b.star ? P.teal : P.van, b.inSession, b.name); T.add(van);
      // excavation site: trench, spoil heap, barriers, an excavator boom
      const trench = this.box(7, 0.5, 4, P.trench, sitePos.x, -0.45, sitePos.z + 6); trench.receiveShadow = true; T.add(trench);
      const spoil = new THREE.Mesh(new THREE.SphereGeometry(2.4, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), std(P.dirt, { roughness: 1 })); spoil.scale.set(1.4, 0.7, 1); spoil.position.set(sitePos.x + 6, 0.6, sitePos.z + 6); spoil.castShadow = true; T.add(spoil);
      for (const dx of [-4.5, 4.5]) { T.add(this.box(0.2, 1.1, 4.4, P.barrier, sitePos.x + dx, 0.6, sitePos.z + 6)); T.add(this.box(0.2, 0.12, 4.4, 0xffffff, sitePos.x + dx, 1.3, sitePos.z + 6)); }
      const boom = new THREE.Group(); boom.position.set(sitePos.x - 4.2, 2.2, sitePos.z + 2);
      const arm = this.box(0.6, 0.6, 5, P.amber, 0, 0, 2.5); boom.add(arm);
      const bucket = new THREE.Group(); bucket.position.set(0, 0, 5); bucket.add(this.box(0.6, 0.6, 3, P.amber, 0, -1.5, 0)); bucket.add(this.box(1.4, 1, 1.2, P.gunmetal, 0, -3.2, 0)); boom.add(bucket);
      const cabin = this.box(2.4, 2, 2.6, P.amber, sitePos.x - 4.2, 0.6, sitePos.z - 0.6); T.add(cabin); T.add(this.box(2.8, 0.8, 3.4, P.tyre, sitePos.x - 4.2, 0.6, sitePos.z - 0.6)); T.add(boom);
      if (b.inSession) { van.position.set(sitePos.x + 1, 0.6, sitePos.z); van.rotation.y = Math.PI / 2; }
      else { van.position.copy(bayPos); van.rotation.y = Math.PI; boom.visible = false; cabin.visible = false; trench.visible = false; spoil.visible = false; }
      this.vans.set(b.repId, { group: van, bay: bayPos, site: new THREE.Vector3(sitePos.x + 1, 0.6, sitePos.z), rot: van.rotation.y, busy: false });
      this.digs.push({ site: sitePos.clone(), boom, bucket, clods: [], active: b.inSession, nextClod: Math.random() });
      const ax = b.inSession ? sitePos.x : bayPos.x, az = b.inSession ? sitePos.z : bayPos.z;
      if (b.fire) this.addFire(new THREE.Vector3(ax + 1, 4.4, az), 1.8);
      if (b.star) this.addHalo(new THREE.Vector3(ax + 1, 0.62, az), 5.2);
      this.labelAnchors.push({ key: `bay:${b.repId}`, pos: new THREE.Vector3(ax + 1, b.fire ? 11 : 6.8, az), short: b.name, title: `ADVISOR · ${b.name}`, sub: b.note, tone: b.tone, kind: "bay" });
    });

    // ================= CLINIC DISTRICT
    const cl = { x: dp.x + dp.w + 18, z: -44, w: 78, d: 84 };
    this.plinth(cl.x, cl.z, cl.w, cl.d, "CLINICS");
    this.clinicRoadX = cl.x + cl.w + 10;
    const out = this.pipe([[dp.x + dp.w - 2, 1.4, dp.z + 18], [cl.x - 6, 1.4, dp.z + 18], [cl.x - 6, 1.4, cl.z + cl.d / 2]], 0.8);
    for (let i = 0; i < Math.min(6, town.todayBooked + 1); i++) this.addPulse(out, i / 6, 0.045);
    town.tanks.forEach((t, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const hx = cl.x + 20 + col * 36, hz = cl.z + 20 + row * 34;
      const g = new THREE.Group(); g.position.set(hx, 0.6, hz);
      g.add(this.box(16, 7, 12, P.concrete, 0, 0, 0, { map: concreteTex() }));
      g.add(this.box(16.6, 0.5, 12.6, P.roof, 0, 7, 0, { map: roofTex() }));
      g.add(this.box(14, 2.2, 0.3, P.glass, 0, 3.4, 6.05, { transparent: true, opacity: 0.6, roughness: 0.1, metalness: 0.3, emissive: 0x9fc9ff, emissiveIntensity: 0.2 }));
      g.add(this.box(3, 3.2, 0.3, P.door, 0, 0, 6.05));
      g.add(this.box(1.6, 0.4, 0.3, P.teal, 0, 5.9, 6.1)); g.add(this.box(0.4, 1.6, 0.3, P.teal, 0, 5.3, 6.1));
      g.add(this.box(2.5, 1.2, 2.5, P.steelDark, -5, 7.5, -3)); g.add(this.box(2.5, 1.2, 2.5, P.steelDark, 5, 7.5, -3));
      // storage tank with sight-glass and display
      const tr = 3.4, tankH = 8;
      g.add(this.cylinder(tr + 0.8, 0.6, P.concrete, 13, 0, 0, { map: concreteTex() }));
      g.add(this.cylinder(tr, tankH, P.steel, 13, 0.6, 0, {}, true));
      for (const y of [0.33, 0.66]) g.add(this.ring(tr + 0.06, 0.12, P.steelDark, 13, 0.6 + tankH * y, 0));
      g.add(this.cylinder(tr + 0.1, 0.5, P.steelDark, 13, 0.6 + tankH, 0));
      g.add(this.box(0.9, tankH - 0.6, 0.5, P.gunmetal, 13 - tr * 0.72, 0.9, tr * 0.72));
      g.add(this.box(0.5, tankH - 1, 0.3, P.glass, 13 - tr * 0.72, 1.1, tr * 0.72 + 0.2, { transparent: true, opacity: 0.35, roughness: 0.1, metalness: 0 }));
      const level = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.01, 0.22), emissive(P.waterGlow, 1.8)); level.position.set(13 - tr * 0.72, 1.1, tr * 0.72 + 0.22); g.add(level);
      const fill: Fill = { water: level, target: Math.max(0.02, t.fill), maxH: tankH - 1.1, base: 1.1 };
      this.fills.push(fill); this.tankFills.set(t.clinicId, fill);
      const holder = new THREE.Group(); holder.position.set(13, 0.6 + tankH + 2.4, 0); holder.rotation.y = Math.PI / 4; g.add(holder);
      this.tankPanels.set(t.clinicId, holder); this.paintTankPanel(t.clinicId, t.delivered, t.packSize);
      g.add(this.disc(tr + 1.4, TONE_COL[t.tone], 13, 0, 0.02, { transparent: true, opacity: t.tone === "grey" ? 0 : 0.35 }));
      this.pipe([[cl.x - 6, 1.4, hz], [hx - 8, 1.4, hz]], 0.5);
      this.tag(g, { kind: "tank", id: t.clinicId }); T.add(g);
      this.tankPos.set(t.clinicId, new THREE.Vector3(hx + 13, 0.6, hz + 6));
      if (t.fire) this.addFire(new THREE.Vector3(hx, 9.4, hz), 2.2);
      this.labelAnchors.push({ key: `tank:${t.clinicId}`, pos: new THREE.Vector3(hx, t.fire ? 16 : 10.6, hz), short: t.name, title: `CLINIC · ${t.name}`, sub: t.note, tone: t.tone, kind: "tank" });
    });

    // ================= FINANCE DISTRICT
    const fi = { x: dp.x, z: dp.z + dp.d + 14, w: dp.w, d: 34 };
    this.plinth(fi.x, fi.z, fi.w, fi.d, "FINANCE");
    const mx = fi.x + 16, mz = fi.z + fi.d / 2;
    const meter = new THREE.Group(); meter.position.set(mx, 0.6, mz);
    meter.add(this.box(18, 6, 12, P.concrete, 0, 0, 0, { map: concreteTex() }));
    meter.add(this.box(18.6, 0.5, 12.6, P.roof, 0, 6, 0, { map: roofTex() }));
    meter.add(this.box(2.4, 2.4, 2.4, P.steelDark, -5, 6.5, 0)); meter.add(this.box(2.4, 2.4, 2.4, P.steelDark, 5, 6.5, 0));
    for (let k = 0; k < 4; k++) meter.add(this.box(0.3, 3, 0.3, P.gunmetal, -6 + k * 4, 6.5, 4));
    const meterSign = panelText(`${town.rangeLabel.toUpperCase()}   OUT $${Math.round(town.totalCost).toLocaleString()}   IN $${Math.round(town.totalRevenue).toLocaleString()}`, { w: 15, h: 1.5, font: 0.62, mono: true, color: town.profit >= 0 ? "#7fe0c8" : "#ffb38a" }); meterSign.position.set(0, 3.6, 6.05); meter.add(meterSign);
    this.tag(meter, { kind: "meter", id: "meter" }); T.add(meter);
    this.labelAnchors.push({ key: "meter", pos: new THREE.Vector3(mx, 10.5, mz), short: "Meter house", title: `FINANCE · ${town.rangeLabel}`, sub: `$${Math.round(town.totalCost).toLocaleString()} out · $${Math.round(town.totalRevenue).toLocaleString()} in`, tone: town.profit >= 0 ? "green" : "grey", kind: "meter" });
    town.puddles.forEach((p, i) => {
      const px = mx + 20 + i * 15, pz = mz;
      const loss = Math.max(0, -p.profit);
      const rad = p.tone === "red" ? 3 + Math.min(4, loss / 500) : 2.2;
      const pool = this.disc(rad, p.star ? P.gold : P.water, px, pz, 0.63, { transparent: true, opacity: p.tone === "grey" ? 0.18 : 0.55, roughness: 0.05, metalness: 0.4 });
      this.tag(pool, { kind: "puddle", id: p.city }); T.add(pool);
      T.add(this.cylinder(0.5, 1.4, P.steelDark, px, 0.6, pz - rad - 1.2)); T.add(this.box(0.5, 0.5, 2, P.steelDark, px, 1.8, pz - rad - 0.4));
      if (p.tone === "red") { const drip = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), emissive(P.waterGlow, 1.2)); drip.position.set(px, 1.2, pz - rad + 0.3); T.add(drip); }
      if (p.star) this.addHalo(new THREE.Vector3(px, 0.62, pz), rad + 1.2);
      const plate = panelText(p.city.toUpperCase(), { w: 8, h: 1.4, font: 0.62, color: "#c6ced6", bg: "#141a20" }); plate.rotation.x = -Math.PI / 2; plate.rotation.z = Math.PI / 4; plate.position.set(px, 0.64, pz + rad + 2.4); T.add(plate);
      this.labelAnchors.push({ key: `puddle:${p.city}`, pos: new THREE.Vector3(px, 2.6, pz + rad + 1.6), short: p.city, title: `${p.city.toUpperCase()} · ${p.profit >= 0 ? "made" : "lost"} $${Math.round(Math.abs(p.profit)).toLocaleString()}`, sub: p.note, tone: p.tone, kind: "puddle" });
    });

    // ================= roads and light poles
    road(this.scenery, dp.x - 8, this.roadZ, this.clinicRoadX, this.roadZ, 8);
    road(this.scenery, this.clinicRoadX, this.roadZ, this.clinicRoadX, cl.z - 6, 8);
    for (const [, p] of this.tankPos) road(this.scenery, p.x + 4, p.z + 4, this.clinicRoadX, p.z + 4, 5);
    for (const [x, z] of [[dp.x - 6, this.roadZ - 6], [dp.x + dp.w / 2, this.roadZ - 6], [this.clinicRoadX - 6, this.roadZ - 6], [this.clinicRoadX - 6, cl.z + 20], [this.clinicRoadX - 6, cl.z + 60]]) this.lightPole(x, z);
    // containers for scale
    this.container3(dp.x + dp.w - 14, dp.z + 6, P.navyLight); this.container3(dp.x + dp.w - 14, dp.z + 10, P.gunmetal); this.container3(cl.x + cl.w - 14, cl.z + 8, P.steelDark);

    this.fitCamera();
  }

  deliverBooking(repId: string | null, clinicId: string | null) {
    const van = (repId && this.vans.get(repId)) || [...this.vans.values()].find((v) => !v.busy) || null;
    if (!van || van.busy) return;
    const id = clinicId && this.tankPos.has(clinicId) ? clinicId : [...this.tankPos.keys()][0];
    const dest = id ? this.tankPos.get(id) : null;
    if (!dest || !id) return;
    const from = van.group.position.clone();
    const pts = [from, new THREE.Vector3(from.x, 0.6, this.roadZ), new THREE.Vector3(this.clinicRoadX, 0.6, this.roadZ), new THREE.Vector3(this.clinicRoadX, 0.6, dest.z + 4), new THREE.Vector3(dest.x + 4, 0.6, dest.z + 4)];
    van.busy = true;
    this.trips.push({ van, curve: new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.05), t: 0, speed: 0.2, phase: "out", clinicId: id, crate: null, dropT: 0, puffs: 0 });
  }

  setTankFill(clinicId: string, delivered: number, packSize: number) {
    const f = this.tankFills.get(clinicId);
    if (f) f.target = Math.max(0.02, packSize > 0 ? Math.min(1, delivered / packSize) : 0);
    this.paintTankPanel(clinicId, delivered, packSize);
  }

  focus(target: PickTarget | null) {
    const key = target ? (target.kind === "depot" || target.kind === "meter" ? target.kind : `${target.kind}:${target.id}`) : null;
    const a = key ? this.labelAnchors.find((l) => l.key === key) : null;
    const look = a ? new THREE.Vector3(a.pos.x, 0, a.pos.z) : this.center.clone();
    this.camera.position.copy(look).add(CAM_OFFSET); this.camera.lookAt(look);
    this.zoomTarget = target ? 0.62 : 1;
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
    this.renderer.domElement.removeEventListener("pointermove", this.onMove);
    this.renderer.domElement.removeEventListener("click", this.onClick);
    this.clearTown();
    this.renderer.dispose();
    this.renderer.domElement.parentNode?.removeChild(this.renderer.domElement);
  }

  // ======================================================== builders
  private setNight(night: boolean) {
    this.sun.intensity = night ? 0.9 : 2.6;
    this.sun.color.set(night ? 0x8fa8d8 : 0xffe7cf);
    this.renderer.toneMappingExposure = night ? 1 : 1.3;
  }
  private buildGround() {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), std(P.ground, { roughness: 0.95, map: asphaltTex() })); g.rotation.x = -Math.PI / 2; g.receiveShadow = true; this.scene.add(g);
  }
  private plinth(x: number, z: number, w: number, d: number, title: string) {
    const base = this.box(w, 0.6, d, P.plinthTop, x + w / 2, 0, z + d / 2, { map: concreteTex(), roughness: 0.9 }); this.scenery.add(base);
    const kerb = new THREE.Mesh(new THREE.BoxGeometry(w + 1.2, 0.35, d + 1.2), std(P.kerb, { roughness: 0.8 })); kerb.position.set(x + w / 2, 0.175, z + d / 2); kerb.receiveShadow = true; this.scenery.add(kerb);
    const t = panelText(title, { w: Math.min(w - 6, 30), h: 2.6, font: 1.3, color: "#aab6c2", bg: "#262d35", mono: true }); t.rotation.x = -Math.PI / 2; t.rotation.z = Math.PI / 4; t.position.set(x + w / 2, 0.62, z + d - 6); this.scenery.add(t);
  }
  private clearTown() {
    for (const p of this.pulses) this.scene.remove(p.mesh);
    this.town.clear(); this.scenery.clear(); this.fx.clear();
    this.pickables = []; this.pulses = []; this.fills = []; this.tankFills.clear(); this.tankPanels.clear(); this.fires = []; this.halos = []; this.digs = []; this.vans.clear(); this.trips = []; this.puffs = []; this.tankPos.clear(); this.labelAnchors = []; this.hovered = null;
  }
  private tag(o: THREE.Object3D, t: PickTarget) { o.userData = t; this.pickables.push(o); }
  private box(w: number, h: number, d: number, c: number, x: number, y: number, z: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), std(c, extra)); m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true; return m; }
  private cylinder(r: number, h: number, c: number, x: number, y: number, z: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}, steel = false) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 40), steel ? steelMat(c) : std(c, extra)); m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true; return m; }
  private ring(r: number, t: number, c: number, x: number, y: number, z: number) { const m = new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, 48), std(c, { roughness: 0.5, metalness: 0.6 })); m.rotation.x = Math.PI / 2; m.position.set(x, y, z); m.castShadow = true; return m; }
  private disc(r: number, c: number, x: number, z: number, y: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 48), std(c, extra)); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; return m; }
  private pipe(points: [number, number, number][], r: number) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, "catmullrom", 0);
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(8, points.length * 20), r, 16, false), std(P.pipe, { roughness: 0.5, metalness: 0.6 })); m.castShadow = true; m.receiveShadow = true; this.town.add(m);
    for (const p of points) { const f = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.3, r + 0.3, 0.5, 16), std(P.flange, { metalness: 0.7, roughness: 0.45 })); f.position.set(p[0], p[1], p[2]); f.rotation.z = Math.PI / 2; this.town.add(f); }
    for (let i = 1; i < points.length - 1; i++) { const p = points[i]; this.town.add(this.cylinder(0.35, p[1], P.gunmetal, p[0], 0, p[2])); }
    return curve;
  }
  private addPulse(curve: THREE.Curve<THREE.Vector3>, t: number, speed: number) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), emissive(P.waterGlow, 2)); this.scene.add(m); this.pulses.push({ mesh: m, curve, t, speed });
  }
  private makeVan(color: number, lightsOn: boolean, name: string) {
    const g = new THREE.Group();
    const body = this.box(3.4, 2.7, 6.4, color, 0, 0.55, -0.6, { roughness: 0.35, metalness: 0.3 }); g.add(body);
    const cab = this.box(3.4, 2.1, 2.4, color, 0, 0.55, 3.8, { roughness: 0.35, metalness: 0.3 }); g.add(cab);
    g.add(this.box(3.2, 1, 0.2, P.vanDark, 0, 1.75, 5.05, { roughness: 0.1, metalness: 0.5 }));
    g.add(this.box(0.2, 0.8, 5.6, P.vanDark, 1.71, 1.9, -0.6, { roughness: 0.1, metalness: 0.5 }));
    g.add(this.box(3.4, 0.35, 6.4, P.navy, 0, 1.6, -0.6));
    for (const s of [1, -1]) { const t = panelText(name.toUpperCase(), { w: 3.2, h: 0.9, font: 0.5, color: "#e6ebf0", bg: "#1f3350" }); t.position.set(s * 1.72, 1.35, -0.6); t.rotation.y = s * Math.PI / 2; g.add(t); }
    g.add(this.box(3, 0.15, 5, P.steelDark, 0, 3.25, -0.4)); for (let i = 0; i < 4; i++) g.add(this.box(3, 0.1, 0.15, P.steel, 0, 3.4, -2.6 + i * 1.5));
    const lamp = emissive(0xfff1cf, lightsOn ? 2.5 : 0.1);
    for (const s of [1, -1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 0.15), lamp); l.position.set(s * 1.1, 1.3, 5.05); g.add(l); }
    for (const [wx, wz] of [[-1.7, 2.3], [1.7, 2.3], [-1.7, -2.3], [1.7, -2.3]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.5, 20), std(P.tyre, { roughness: 0.9 })); w.rotation.z = Math.PI / 2; w.position.set(wx, 0.7, wz); w.castShadow = true; g.add(w); const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.52, 12), steelMat()); hub.rotation.z = Math.PI / 2; hub.position.set(wx, 0.7, wz); g.add(hub); }
    return g;
  }
  private lightPole(x: number, z: number) {
    this.scenery.add(this.cylinder(0.18, 9, P.gunmetal, x, 0, z)); this.scenery.add(this.box(2.2, 0.2, 0.3, P.gunmetal, x + 1, 8.8, z));
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.5), emissive(0xffe9c4, 2)); head.position.set(x + 2, 8.7, z); this.scenery.add(head);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xffe0b0, transparent: true, opacity: 0.35, depthWrite: false })); glow.scale.set(6, 6, 1); glow.position.set(x + 2, 8.6, z); this.scenery.add(glow);
  }
  private container3(x: number, z: number, c: number) { this.scenery.add(this.box(12, 2.6, 2.6, c, x, 0.6, z, { roughness: 0.6, metalness: 0.4, map: roofTex() })); }
  private paintTankPanel(clinicId: string, delivered: number, packSize: number) {
    const holder = this.tankPanels.get(clinicId); if (!holder) return;
    holder.clear();
    const pct = packSize > 0 ? Math.round(Math.min(1, delivered / packSize) * 100) : 0;
    const panel = panelText(`${delivered} / ${packSize}\n${pct}% FULL`, { w: 6.4, h: 3.2, font: 1.05, mono: true }); holder.add(panel);
    holder.add(this.box(6.8, 3.6, 0.3, P.gunmetal, 0, -1.8, -0.2)); holder.add(this.box(0.3, 3, 0.3, P.gunmetal, 0, -4.8, -0.2));
  }
  private addFire(pos: THREE.Vector3, size: number) {
    const group = new THREE.Group(); group.position.copy(pos);
    const flames: THREE.Sprite[] = [];
    for (let i = 0; i < 6; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex(), color: 0xffb070, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); s.scale.set(size * 1.6, size * 2.2, 1); s.position.set((Math.random() - 0.5) * size, size * 0.6 + i * 0.2, (Math.random() - 0.5) * size); group.add(s); flames.push(s); }
    const smoke: THREE.Sprite[] = [];
    for (let i = 0; i < 6; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex(), transparent: true, depthWrite: false, opacity: 0.8 })); s.scale.set(size * 2.5, size * 2.5, 1); s.position.set(0, size * 2 + i * 1.5, 0); group.add(s); smoke.push(s); }
    const light = new THREE.PointLight(P.ember, 40 * size, 30 * size, 2); light.position.set(0, size, 0); group.add(light);
    this.fx.add(group); this.fires.push({ group, flames, smoke, light, size });
  }
  private addHalo(pos: THREE.Vector3, r: number) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.35, r, 64), new THREE.MeshBasicMaterial({ color: P.gold, transparent: true, opacity: 0.7, side: THREE.DoubleSide, toneMapped: false })); ring.rotation.x = -Math.PI / 2; ring.position.copy(pos); this.fx.add(ring);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: P.gold, transparent: true, opacity: 0.25, depthWrite: false })); glow.scale.set(r * 2.4, r * 2.4, 1); glow.position.set(pos.x, pos.y + 0.5, pos.z); this.fx.add(glow);
    this.halos.push({ ring, glow, phase: Math.random() * 6 });
  }
  private puff(at: THREE.Vector3) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex(), transparent: true, opacity: 0.6, depthWrite: false })); s.scale.set(1.6, 1.6, 1); s.position.set(at.x, at.y + 1, at.z); this.fx.add(s); this.puffs.push({ s, life: 1 });
  }

  // ======================================================== camera + input
  private fitCamera() {
    const bounds = new THREE.Box3().setFromObject(this.town);
    if (bounds.isEmpty()) return;
    this.center = bounds.getCenter(new THREE.Vector3()); this.center.y = 0;
    this.camera.position.copy(this.center).add(CAM_OFFSET); this.camera.lookAt(this.center); this.camera.updateMatrixWorld();
    const inv = this.camera.matrixWorldInverse;
    const w = this.container.clientWidth || 1440, h = this.container.clientHeight || 900;
    const PANEL = w > 1000 ? 380 : 0, HUD = 64;
    const aspect = w / h;
    const usable = Math.max(1, (w - PANEL) / (h - HUD));
    let need = 1;
    const c = [bounds.min, bounds.max];
    for (const cx of [0, 1]) for (const cy of [0, 1]) for (const cz of [0, 1]) { const v = new THREE.Vector3(c[cx].x, c[cy].y, c[cz].z).applyMatrix4(inv); need = Math.max(need, Math.abs(v.x) / usable, Math.abs(v.y)); }
    this.baseFs = need * 0.98 * (h / (h - HUD));
    const pxToWorld = (2 * this.baseFs * aspect) / w;
    const right = new THREE.Vector3(1, 0, -1).normalize(), down = new THREE.Vector3(-1, 0, -1).normalize();
    this.center.add(right.multiplyScalar((PANEL / 2) * pxToWorld)).add(down.multiplyScalar((HUD / 2) * pxToWorld * 1.3));
    this.camera.position.copy(this.center).add(CAM_OFFSET); this.camera.lookAt(this.center);
    this.resize();
  }
  private resize = () => {
    const w = this.container.clientWidth || 1, h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    const fs = this.baseFs * this.zoom, aspect = w / h;
    this.camera.left = -fs * aspect; this.camera.right = fs * aspect; this.camera.top = fs; this.camera.bottom = -fs;
    this.camera.updateProjectionMatrix();
  };
  private onMove = (e: PointerEvent) => { const r = this.renderer.domElement.getBoundingClientRect(); this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); };
  private onClick = () => { const hit = this.pickAt(); this.opts.onPick?.(hit ? (hit.userData as PickTarget) : null); };
  private pickAt(): THREE.Object3D | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.pickables, true);
    if (!hits.length) return null;
    let o: THREE.Object3D | null = hits[0].object;
    while (o && !(o.userData && (o.userData as PickTarget).kind)) o = o.parent;
    return o;
  }

  // ======================================================== loop
  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.clock.getDelta()), t = this.clock.elapsedTime;
    if (Math.abs(this.zoom - this.zoomTarget) > 0.002) { this.zoom += (this.zoomTarget - this.zoom) * 0.08; this.resize(); }
    for (const p of this.pulses) { p.t = (p.t + p.speed * dt) % 1; const v = p.curve.getPoint(p.t); p.mesh.position.set(v.x, v.y, v.z); }
    for (const f of this.fills) { const cur = f.water.scale.y * 0.01; const next = cur + (f.target * f.maxH - cur) * Math.min(1, dt * 1.6); f.water.scale.y = Math.max(0.01, next) / 0.01; f.water.position.y = f.base + next / 2; }
    for (const f of this.fires) {
      f.flames.forEach((s, i) => { const k = 0.75 + 0.35 * Math.sin(t * 11 + i * 2.1); s.scale.set(f.size * 1.6 * k, f.size * 2.2 * k, 1); s.position.y = f.size * 0.6 + i * 0.25 + Math.sin(t * 7 + i) * 0.2; });
      f.smoke.forEach((s, i) => { const k = (t * 0.35 + i * 0.16) % 1; s.position.y = f.size * 1.8 + k * 9; s.position.x = Math.sin(t * 0.8 + i) * 0.8; s.material.opacity = 0.75 * (1 - k); s.scale.setScalar(f.size * (2 + k * 3)); });
      f.light.intensity = 40 * f.size * (0.8 + 0.3 * Math.sin(t * 17) * Math.sin(t * 5.3));
    }
    for (const h of this.halos) { const k = 0.55 + 0.25 * Math.sin(t * 1.8 + h.phase); (h.ring.material as THREE.MeshBasicMaterial).opacity = k; h.ring.rotation.z = t * 0.3; h.glow.material.opacity = 0.18 + 0.1 * Math.sin(t * 1.8 + h.phase); }
    for (const d of this.digs) {
      if (!d.active) continue;
      d.boom.rotation.x = -0.35 + Math.sin(t * 1.4) * 0.3; d.bucket.rotation.x = 0.6 + Math.sin(t * 1.4 + 1) * 0.5;
      d.nextClod -= dt;
      if (d.nextClod <= 0) { d.nextClod = 0.6 + Math.random() * 0.5; const c = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35), std(P.dirt, { roughness: 1 })); c.position.set(d.site.x - 1, 2, d.site.z + 6); this.fx.add(c); d.clods.push({ mesh: c, v: new THREE.Vector3(4 + Math.random() * 2, 4 + Math.random() * 2, (Math.random() - 0.5) * 2), life: 1.2 }); }
      for (const c of [...d.clods]) { c.life -= dt; c.v.y -= 14 * dt; c.mesh.position.addScaledVector(c.v, dt); if (c.life <= 0 || c.mesh.position.y < 0.6) { this.fx.remove(c.mesh); d.clods = d.clods.filter((x) => x !== c); } }
    }
    for (const trip of [...this.trips]) this.stepTrip(trip, dt);
    for (const p of [...this.puffs]) { p.life -= dt * 0.9; p.s.position.y += dt * 1.2; p.s.scale.addScalar(dt * 1.2); p.s.material.opacity = 0.6 * Math.max(0, p.life); if (p.life <= 0) { this.fx.remove(p.s); this.puffs = this.puffs.filter((x) => x !== p); } }

    const hit = this.pickAt();
    if (hit !== this.hovered) { this.hovered = hit; this.renderer.domElement.style.cursor = hit ? "pointer" : "default"; }
    this.renderer.render(this.scene, this.camera);

    if (this.opts.onLabels) {
      const w = this.container.clientWidth, h = this.container.clientHeight;
      const hv = this.hovered?.userData as PickTarget | undefined;
      const hoverKey = hv ? (hv.kind === "depot" || hv.kind === "meter" ? hv.kind : `${hv.kind}:${hv.id}`) : null;
      this.opts.onLabels(this.labelAnchors.map((a) => { const v = a.pos.clone().project(this.camera); return { key: a.key, x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h, short: a.short, title: a.title, sub: a.sub, tone: a.tone, hidden: v.z > 1, active: a.key === hoverKey, kind: a.kind }; }));
    }
  };

  private stepTrip(trip: Trip, dt: number) {
    const g = trip.van.group;
    if (trip.phase === "drop") {
      trip.dropT += dt;
      const dest = this.tankPos.get(trip.clinicId);
      if (trip.crate && dest) {
        const k = Math.min(1, trip.dropT / 1.1);
        const start = new THREE.Vector3(g.position.x, 3, g.position.z), end = new THREE.Vector3(dest.x, 9.4, dest.z - 6);
        trip.crate.position.lerpVectors(start, end, k); trip.crate.position.y += Math.sin(k * Math.PI) * 7; trip.crate.rotation.y += dt * 5;
        if (k >= 1) { this.fx.remove(trip.crate); trip.crate = null; const splash = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: P.waterGlow, transparent: true, opacity: 0.8, depthWrite: false })); splash.scale.set(3, 3, 1); splash.position.set(dest.x, 9.2, dest.z - 6); this.fx.add(splash); this.puffs.push({ s: splash, life: 1 }); }
      }
      if (trip.dropT > 2) {
        trip.phase = "back";
        const home = trip.van.site;
        trip.curve = new THREE.CatmullRomCurve3([g.position.clone(), new THREE.Vector3(this.clinicRoadX, 0.6, g.position.z), new THREE.Vector3(this.clinicRoadX, 0.6, this.roadZ), new THREE.Vector3(home.x, 0.6, this.roadZ), home.clone()], false, "catmullrom", 0.05); trip.t = 0; trip.speed = 0.15;
      }
      return;
    }
    trip.t += dt * trip.speed; trip.puffs -= dt;
    if (trip.puffs <= 0) { trip.puffs = 0.15; this.puff(g.position); }
    if (trip.t >= 1) {
      if (trip.phase === "out") { trip.phase = "drop"; trip.dropT = 0; const crate = this.box(1.5, 1.5, 1.5, P.navyLight, g.position.x, 3, g.position.z, { roughness: 0.6 }); this.fx.add(crate); trip.crate = crate; }
      else { g.position.copy(trip.van.site); g.rotation.y = trip.van.rot; trip.van.busy = false; this.trips = this.trips.filter((x) => x !== trip); }
      return;
    }
    const p = trip.curve.getPoint(trip.t), ahead = trip.curve.getPoint(Math.min(1, trip.t + 0.01));
    g.position.set(p.x, 0.6, p.z); g.rotation.y = Math.atan2(ahead.x - p.x, ahead.z - p.z);
  }
}

function road(parent: THREE.Object3D, x1: number, z1: number, x2: number, z2: number, w: number) {
  const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz); if (len < 1) return;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(len, w), std(0x2b3239, { roughness: 0.95, map: asphaltTex() })); m.rotation.x = -Math.PI / 2; m.rotation.z = -Math.atan2(dz, dx); m.position.set((x1 + x2) / 2, 0.05, (z1 + z2) / 2); m.receiveShadow = true; parent.add(m);
  const n = Math.floor(len / 6);
  for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; const l = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.22), new THREE.MeshBasicMaterial({ color: 0x8a939c })); l.rotation.x = -Math.PI / 2; l.rotation.z = -Math.atan2(dz, dx); l.position.set(x1 + dx * t, 0.06, z1 + dz * t); parent.add(l); }
}
