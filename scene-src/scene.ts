import * as THREE from "three";
import type { Town, Tone } from "../src/components/numbers-game/model";
import type { LabelSpec, PickKind, PickTarget, SceneOpts, TownSceneApi } from "../src/components/numbers-game/scene-types";

/**
 * The plumbing world. The business runs through a pipe network, drawn with
 * three.js at a 35° elevated camera:
 *
 *   Acquisition plant  - an intake pumping station per ad. Flow strength in
 *                        the pipe is the lead rate; a losing ad leaks.
 *   Advisor depot      - a processing station per advisor. Strong performers
 *                        push clean high-pressure flow; poor follow-up shows
 *                        as pressure backing up behind the station.
 *   Clinic district    - a commercial building per clinic with a storage
 *                        tank beside it. Full pack = tank at 100%, valve shut.
 *   Meter station      - revenue flows into the central finance facility;
 *                        profitable cities glow green, losing ones leak.
 *
 * Problems live in the world (leaks, back-pressure, closed valves, beacons),
 * not just in the panel. Everything clickable carries userData = {kind, id}.
 */

type Opts = SceneOpts;
export type { LabelSpec, PickKind, PickTarget };

const P = {
  sky: 0xb9c6d2, grass: 0x7d9468, grassDark: 0x6a8058, concrete: 0x9aa1a8, concreteDark: 0x7f868d, kerb: 0xb5bcc3, asphalt: 0x4b525a, gravel: 0x8c8f92,
  pipe: 0x4c6a86, pipeDark: 0x3b556d, flange: 0x2f3b47, steel: 0xb4bcc4, steelDark: 0x7c8690, gunmetal: 0x3d4650, navy: 0x22406a,
  wall: 0xd7d9dc, wallDark: 0xb9bec4, roof: 0x596069, glass: 0x9cc4e8, door: 0x2c343c, van: 0xf0f2f4, vanTrim: 0x22406a, tyre: 0x1c2024,
  water: 0x39a9e8, waterGlow: 0x6fd0ff, red: 0xd8473b, amber: 0xe7a23b, green: 0x39b37b, grey: 0x8b96a1, gold: 0xd9b23f,
  dirt: 0x6e5238, trench: 0x2e2419, barrier: 0xe08a2f, smoke: 0xdfe4e8,
};
const TONE_COL: Record<Tone, number> = { red: P.red, amber: P.amber, green: P.green, grey: P.grey };
const CAM_OFFSET = new THREE.Vector3(58, 57, 58);

// ---------------------------------------------------------------- textures (light; the material colour tints them)
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
const concreteTex = () => canvasTex("concrete", 256, (g, s) => { noise(g, s, "#e2e5e8", 26); g.strokeStyle = "rgba(0,0,0,0.18)"; g.lineWidth = 2; g.strokeRect(1, 1, s - 2, s - 2); }, 8);
const grassTex = () => canvasTex("grass", 256, (g, s) => { noise(g, s, "#dfe6d8", 34); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`; g.fillRect(Math.random() * s, Math.random() * s, 2, 3); } }, 24);
const asphaltTex = () => canvasTex("asphalt", 256, (g, s) => noise(g, s, "#d8dbde", 30), 10);
const steelTex = () => canvasTex("steel", 128, (g, s) => { noise(g, s, "#e6e9ec", 14); for (let x = 0; x < s; x += 3) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.07})`; g.fillRect(x, 0, 1, s); } }, 2);
const paintTex = () => canvasTex("paint", 128, (g, s) => { noise(g, s, "#e8eaec", 10); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`; g.fillRect(Math.random() * s, Math.random() * s, 6, 2); } }, 3);
const roofTex = () => canvasTex("roof", 128, (g, s) => { noise(g, s, "#e0e3e6", 12); for (let x = 0; x < s; x += 16) { g.fillStyle = "rgba(0,0,0,0.28)"; g.fillRect(x, 0, 2, s); g.fillStyle = "rgba(255,255,255,0.08)"; g.fillRect(x + 8, 0, 1, s); } }, 3);
const radial = (key: string, stops: [number, string][]) => canvasTex(key, 128, (g, s) => { const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); stops.forEach(([o, c]) => r.addColorStop(o, c)); g.fillStyle = r; g.fillRect(0, 0, s, s); });
const glowTex = () => radial("glow", [[0, "rgba(255,255,255,0.95)"], [0.35, "rgba(255,255,255,0.3)"], [1, "rgba(255,255,255,0)"]]);
const dropTex = () => radial("drop", [[0, "rgba(220,240,255,0.95)"], [0.5, "rgba(120,190,240,0.5)"], [1, "rgba(120,190,240,0)"]]);
const steamTex = () => radial("steam", [[0, "rgba(255,255,255,0.55)"], [1, "rgba(255,255,255,0)"]]);

function textPanel(text: string, o: { w: number; h: number; font?: number; color?: string; bg?: string; mono?: boolean }) {
  const scale = 28;
  const c = document.createElement("canvas"); c.width = Math.round(o.w * scale); c.height = Math.round(o.h * scale);
  const g = c.getContext("2d")!;
  g.fillStyle = o.bg ?? "#101418"; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = "rgba(255,255,255,0.15)"; g.lineWidth = 2; g.strokeRect(1, 1, c.width - 2, c.height - 2);
  g.fillStyle = o.color ?? "#8fdcff"; g.textAlign = "center"; g.textBaseline = "middle";
  const px = (o.font ?? o.h * 0.5) * scale;
  g.font = `600 ${px}px ${o.mono ? "ui-monospace, Menlo, monospace" : "-apple-system, Inter, Helvetica, Arial, sans-serif"}`;
  const lines = text.split("\n");
  lines.forEach((ln, i) => g.fillText(ln, c.width / 2, c.height / 2 + (i - (lines.length - 1) / 2) * px * 1.2));
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return new THREE.Mesh(new THREE.PlaneGeometry(o.w, o.h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
}

const std = (color: number, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.12, ...o });
const painted = (color: number) => std(color, { roughness: 0.45, metalness: 0.35, map: paintTex() });
const steelMat = (color = P.steel) => std(color, { roughness: 0.38, metalness: 0.8, map: steelTex() });
const emissive = (color: number, intensity = 1.6) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4, metalness: 0 });
const sprite = (map: THREE.Texture, color: number, opacity: number, additive = false) => new THREE.Sprite(new THREE.SpriteMaterial({ map, color, transparent: true, opacity, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }));

type Fill = { water: THREE.Mesh; target: number; maxH: number; base: number };
type Flow = { ring: THREE.Mesh; curve: THREE.Curve<THREE.Vector3>; t: number; speed: number };
type Leak = { at: THREE.Vector3; dir: THREE.Vector3; drops: { s: THREE.Sprite; v: THREE.Vector3; life: number }[]; next: number; puddle: THREE.Mesh };
type Beacon = { dome: THREE.Mesh; glow: THREE.Sprite; phase: number; color: number };
type Steam = { at: THREE.Vector3; puffs: { s: THREE.Sprite; life: number }[]; next: number };
type Spin = { mesh: THREE.Object3D; speed: number };
type Halo = { ring: THREE.Mesh; phase: number };
type Dig = { site: THREE.Vector3; boom: THREE.Group; bucket: THREE.Group; clods: { mesh: THREE.Mesh; v: THREE.Vector3; life: number }[]; next: number };
type Van = { group: THREE.Group; home: THREE.Vector3; rot: number; busy: boolean };
type Trip = { van: Van; curve: THREE.CatmullRomCurve3; t: number; speed: number; phase: "out" | "drop" | "back"; clinicId: string; crate: THREE.Mesh | null; dropT: number; puffT: number };
type Puff = { s: THREE.Sprite; life: number };

export class TownScene implements TownSceneApi {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.OrthographicCamera;
  private container: HTMLElement;
  private opts: Opts;
  private raf = 0;
  private clock = new THREE.Clock();
  private world = new THREE.Group();
  private scenery = new THREE.Group();
  private fx = new THREE.Group();
  private pickables: THREE.Object3D[] = [];
  private flows: Flow[] = [];
  private fills: Fill[] = [];
  private tankFills = new Map<string, Fill>();
  private tankPanels = new Map<string, THREE.Group>();
  private leaks: Leak[] = [];
  private beacons: Beacon[] = [];
  private steams: Steam[] = [];
  private spins: Spin[] = [];
  private halos: Halo[] = [];
  private digs: Dig[] = [];
  private vans = new Map<string, Van>();
  private trips: Trip[] = [];
  private puffs: Puff[] = [];
  private tankPos = new Map<string, THREE.Vector3>();
  private roadZ = 40;
  private clinicRoadX = 0;
  private labelAnchors: { key: string; pos: THREE.Vector3; short: string; title: string; kpis: [string, string][]; tone: Tone; kind: PickKind }[] = [];
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
    this.container = container; this.opts = opts;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement); this.renderer.domElement.style.display = "block";

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -400, 800);
    this.camera.position.copy(CAM_OFFSET); this.camera.lookAt(0, 0, 0);

    this.scene.background = new THREE.Color(P.sky);
    this.scene.fog = new THREE.Fog(P.sky, 320, 620);
    this.scene.add(new THREE.HemisphereLight(0xdfeaf5, 0x55694a, 1.15));
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    this.sun = new THREE.DirectionalLight(0xfff1dd, 2.4); this.sun.position.set(70, 100, 30);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    Object.assign(this.sun.shadow.camera, { left: -230, right: 230, top: 230, bottom: -230, near: 1, far: 500 });
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.03; this.sun.shadow.radius = 3;
    this.scene.add(this.sun);
    const fill = new THREE.DirectionalLight(0xbfd6ff, 0.5); fill.position.set(-60, 40, -80); this.scene.add(fill);
    this.scene.add(this.world, this.scenery, this.fx);
    this.buildGround();

    this.renderer.domElement.addEventListener("pointermove", this.onMove);
    this.renderer.domElement.addEventListener("click", this.onClick);
    window.addEventListener("resize", this.resize);
    this.resize(); this.loop();
  }

  // ======================================================== public
  setTown(town: Town) {
    this.clearTown();
    this.setNight(town.hour < 7 || town.hour >= 19);
    const W = this.world;
    const $ = (n: number | null) => (n === null ? "—" : `$${Math.round(n).toLocaleString()}`);
    const perf = (fire: boolean, star: boolean) => (fire ? "Weak" : star ? "Strong" : "Steady");

    // ================= 1. ACQUISITION PLANT
    const aq = { x: -118, z: -44, w: 74, d: 88 };
    this.plinth(aq.x, aq.z, aq.w, aq.d, "ACQUISITION PLANT");
    const headerX = aq.x + aq.w - 6;
    const headerZ0 = aq.z + 8, headerZ1 = aq.z + aq.d - 8;
    this.pipe([[headerX, 2, headerZ0], [headerX, 2, headerZ1]], 1.3);
    const totalLeads = Math.max(1, town.towers.reduce((s, t) => s + t.leads, 0));
    town.towers.forEach((tw, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = aq.x + 16 + col * 26, z = aq.z + 18 + row * 30;
      const g = new THREE.Group(); g.position.set(x, 0.6, z);
      // water tower on a steel frame
      const legH = 9, r = 4.6, tankH = 6;
      for (const [dx, dz] of [[-2.8, -2.8], [2.8, -2.8], [-2.8, 2.8], [2.8, 2.8]]) g.add(this.box(0.55, legH, 0.55, P.gunmetal, dx, 0, dz, { metalness: 0.6, roughness: 0.5 }));
      for (const y of [3, 6.5]) { g.add(this.box(6.2, 0.3, 0.3, P.gunmetal, 0, y, -2.8)); g.add(this.box(6.2, 0.3, 0.3, P.gunmetal, 0, y, 2.8)); g.add(this.box(0.3, 0.3, 6.2, P.gunmetal, -2.8, y, 0)); g.add(this.box(0.3, 0.3, 6.2, P.gunmetal, 2.8, y, 0)); }
      g.add(this.cyl(r + 0.4, 0.5, P.gunmetal, 0, legH, 0));
      const shell = new THREE.Mesh(new THREE.CylinderGeometry(r, r, tankH, 40), painted(P.navy)); shell.position.y = legH + 0.5 + tankH / 2; shell.castShadow = true; g.add(shell);
      for (const y of [0.2, 0.8]) g.add(this.ring(r + 0.06, 0.12, P.steel, 0, legH + 0.5 + tankH * y, 0));
      const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2), steelMat(P.steelDark)); cap.scale.y = 0.4; cap.position.y = legH + 0.5 + tankH; cap.castShadow = true; g.add(cap);
      g.add(this.ring(r + 1, 0.1, P.gunmetal, 0, legH + 1.4, 0)); for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; g.add(this.box(0.07, 1, 0.07, P.gunmetal, Math.cos(a) * (r + 1), legH + 0.5, Math.sin(a) * (r + 1))); }
      // sight-glass on the tank: lead level
      g.add(this.box(0.7, tankH - 0.8, 0.4, P.gunmetal, -r * 0.7, legH + 0.9, r * 0.7));
      const level = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.01, 0.2), emissive(P.waterGlow, 1.6)); level.position.set(-r * 0.7, legH + 1.1, r * 0.7 + 0.2); g.add(level);
      this.fills.push({ water: level, target: Math.max(0.05, tw.fill), maxH: tankH - 1.2, base: legH + 1.1 });
      // pump skid at the base with motor, gauge and outlet valve
      g.add(this.box(7, 0.5, 4, P.concreteDark, 5.5, 0, 5.5, { map: concreteTex() }));
      const pump = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 3.2, 24), painted(P.pipe)); pump.rotation.z = Math.PI / 2; pump.position.set(4.6, 1.6, 5.5); pump.castShadow = true; g.add(pump);
      const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.2, 24), painted(0x3a3f45)); motor.rotation.z = Math.PI / 2; motor.position.set(7.3, 1.6, 5.5); g.add(motor);
      const fan = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.12, 6, 18), steelMat()); fan.rotation.y = Math.PI / 2; fan.position.set(8.5, 1.6, 5.5); g.add(fan);
      if (!tw.fire && tw.leads > 0) this.spins.push({ mesh: fan, speed: tw.star ? 14 : 6 });
      g.add(this.gauge(4.6, 3.4, 5.5, tw.fire ? "red" : tw.star ? "green" : "grey"));
      g.add(this.valve(8.6, 2, 3.2, !tw.fire && tw.leads === 0));
      g.add(this.cyl(0.55, legH - 1, P.pipe, 0, 0.5, r + 0.3)); // downpipe from tank
      this.pipe([[x, 2, z + r + 0.3], [x, 2, z + 5.5], [x + 4.6, 2, z + 5.5]], 0.55, false);
      // branch to the header, with a valve; flow strength from lead share
      const branch = this.pipe([[x + 10, 2, z + 5.5], [headerX - 4, 2, z + 5.5], [headerX, 2, z + 5.5]], 0.8);
      this.valveOnPipe(x + 12.5, 2, z + 5.5, 0.8);
      const share = tw.leads / totalLeads;
      const n = tw.fire ? 1 : Math.max(1, Math.round(share * 10));
      for (let k = 0; k < n; k++) this.addFlow(branch, k / n, tw.star ? 0.32 : tw.fire ? 0.05 : 0.16, 0.8);
      // status light on the frame
      g.add(this.light(0, legH + 0.5 + tankH + 2.4, 0, TONE_COL[tw.tone], tw.tone !== "grey"));
      if (tw.fire) { this.addLeak(new THREE.Vector3(x + 12.5, 2, z + 5.5), new THREE.Vector3(0, -1, 0.6)); this.addBeacon(new THREE.Vector3(x + 5.5, 2.9, z + 3.6), P.red); }
      if (tw.star) this.addHalo(new THREE.Vector3(x, 0.62, z), r + 2.6);
      this.tag(g, { kind: "tower", id: tw.id }); W.add(g);
      this.labelAnchors.push({ key: `tower:${tw.id}`, pos: new THREE.Vector3(x, legH + tankH + 4.6, z), short: tw.name, title: tw.name, tone: tw.tone, kind: "tower",
        kpis: [["Leads", String(tw.leads)], ["CPL", $(tw.costPerLead)], ["Bookings", String(tw.booked)], ["Cost / showed", $(tw.costPerShow)], ["Trend", tw.costTrend === null ? "n/a" : `${tw.costTrend >= 1 ? "+" : "−"}${Math.round(Math.abs(tw.costTrend - 1) * 100)}% CPL`], ["Performance", perf(tw.fire, tw.star)]] });
    });

    // ================= trunk main to the depot, through the pump station (automations)
    const dp = { x: -28, z: -44, w: 22 + Math.max(1, town.bays.length) * 20, d: 88 };
    const trunkZ = aq.z + aq.d / 2;
    const pumpPos = new THREE.Vector3(aq.x + aq.w + 10, 0.6, trunkZ);
    const trunkA = this.pipe([[headerX, 2, trunkZ], [pumpPos.x - 6, 2, trunkZ]], 1.3);
    const trunkB = this.pipe([[pumpPos.x + 6, 2, trunkZ], [dp.x - 4, 2, trunkZ], [dp.x - 4, 2, dp.z + 14], [dp.x + 6, 2, dp.z + 14]], 1.3);
    const trunkFlow = Math.max(2, Math.min(14, Math.round(totalLeads / 8)));
    for (let k = 0; k < trunkFlow; k++) { this.addFlow(trunkA, k / trunkFlow, 0.25, 1.3); this.addFlow(trunkB, k / trunkFlow, 0.12, 1.3); }
    const ps = new THREE.Group(); ps.position.copy(pumpPos);
    ps.add(this.box(12, 0.6, 10, P.concreteDark, 0, 0, 0, { map: concreteTex() }));
    const bigPump = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 8, 28), painted(P.pipe)); bigPump.rotation.z = Math.PI / 2; bigPump.position.set(0, 2.6, 0); bigPump.castShadow = true; ps.add(bigPump);
    ps.add(this.ring(2.35, 0.2, P.flange, -3.2, 2.6, 0, true)); ps.add(this.ring(2.35, 0.2, P.flange, 3.2, 2.6, 0, true));
    const bigMotor = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 3, 24), painted(0x3a3f45)); bigMotor.rotation.x = Math.PI / 2; bigMotor.position.set(0, 2.6, 5); ps.add(bigMotor);
    const bigFan = new THREE.Mesh(new THREE.TorusGeometry(1, 0.18, 6, 18), steelMat()); bigFan.position.set(0, 2.6, 6.6); ps.add(bigFan);
    if (!town.pump.fire) this.spins.push({ mesh: bigFan, speed: 8 });
    ps.add(this.gauge(-3.8, 5.2, 3.2, town.pump.fire ? "red" : "green"));
    ps.add(this.box(0.4, 4, 0.4, P.gunmetal, 4.5, 0.6, -3.5)); ps.add(this.light(4.5, 5, -3.5, town.pump.fire ? P.red : P.green, true));
    this.tag(ps, { kind: "pump", id: "pump" }); W.add(ps);
    if (town.pump.fire) { this.addBeacon(new THREE.Vector3(pumpPos.x, 5.4, pumpPos.z - 3), P.red); this.addSteam(new THREE.Vector3(pumpPos.x + 3.4, 4.6, pumpPos.z)); }
    this.labelAnchors.push({ key: "pump:pump", pos: new THREE.Vector3(pumpPos.x, 9, pumpPos.z), short: "Main pump", title: "Main pump · automations", tone: town.pump.fire ? "red" : "grey", kind: "pump", kpis: town.pump.issues.length ? town.pump.issues.map((i, k) => [`Issue ${k + 1}`, i] as [string, string]) : [["Leads webhook", "Flowing"], ["Reminder texts", "Sending"]] });

    // ================= 2. ADVISOR DEPOT
    this.plinth(dp.x, dp.z, dp.w, dp.d, "ADVISOR DEPOT");
    const nb = Math.max(1, town.bays.length);
    const whW = dp.w - 12, whD = 20, whCx = dp.x + dp.w / 2, whCz = dp.z + 12;
    const wh = new THREE.Group(); wh.position.set(whCx, 0.6, whCz);
    wh.add(this.box(whW, 10, whD, P.wall, 0, 0, 0, { map: concreteTex(), roughness: 0.85 }));
    wh.add(this.box(whW + 1, 0.7, whD + 1, P.roof, 0, 10, 0, { map: roofTex(), metalness: 0.4, roughness: 0.5 }));
    for (let i = 0; i < Math.floor(whW / 9); i++) wh.add(this.box(5, 0.5, 4, P.glass, -whW / 2 + 6 + i * 9, 10.7, -2, { transparent: true, opacity: 0.6, roughness: 0.1, metalness: 0.3 }));
    wh.add(this.box(whW + 1, 1.6, 0.5, P.navy, 0, 8, whD / 2 + 0.3));
    const sign = textPanel("ADVISOR DEPOT · WAREHOUSE", { w: 16, h: 1.3, font: 0.8, color: "#eef2f6", bg: "#22406a" }); sign.position.set(0, 8.8, whD / 2 + 0.6); wh.add(sign);
    town.bays.forEach((b, i) => { const bx = -whW / 2 + 10 + i * 20; wh.add(this.box(8, 6.5, 0.4, P.door, bx, 0, whD / 2 + 0.05)); for (let k = 1; k < 7; k++) wh.add(this.box(8, 0.06, 0.12, P.steelDark, bx, k, whD / 2 + 0.3)); wh.add(this.light(bx, 7.2, whD / 2 + 0.4, b.inSession ? P.green : P.grey, b.inSession)); });
    this.tag(wh, { kind: "depot", id: "depot" }); W.add(wh);
    this.labelAnchors.push({ key: "depot", pos: new THREE.Vector3(whCx, 14, whCz - 4), short: "Depot warehouse", title: "Advisor depot", tone: "grey", kind: "depot", kpis: [["Leads in the yard", town.yardLeads.toLocaleString()], ["Advisors online", String(town.bays.filter((x) => x.inSession).length)], ["Booked today", String(town.todayBooked)], ["Showed today", String(town.todayShowed)]] });
    // distribution header along the front of the warehouse
    const distZ = whCz + whD / 2 + 4;
    this.pipe([[dp.x + 6, 2, dp.z + 14], [dp.x + 6, 2, distZ], [dp.x + dp.w - 6, 2, distZ]], 1.1);
    // collector behind the stations, out to the clinics
    const collZ = distZ + 26;
    this.roadZ = dp.z + dp.d + 10;
    const collector = this.pipe([[dp.x + 6, 2, collZ], [dp.x + dp.w - 4, 2, collZ]], 1.1);
    town.bays.forEach((b, i) => {
      const sx = whCx - whW / 2 + 10 + i * 20, sz = distZ + 12;
      const g = new THREE.Group(); g.position.set(sx, 0.6, sz);
      // processing station: skid, twin pumps, header, gauge, control cabinet
      g.add(this.box(12, 0.6, 9, P.concreteDark, 0, 0, 0, { map: concreteTex() }));
      for (const px of [-2.6, 2.6]) { const pm = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 4.2, 24), painted(P.pipe)); pm.rotation.x = Math.PI / 2; pm.position.set(px, 1.9, 0); pm.castShadow = true; g.add(pm); const mt = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2, 20), painted(0x3a3f45)); mt.rotation.x = Math.PI / 2; mt.position.set(px, 1.9, 3.2); g.add(mt); const fan = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.1, 6, 16), steelMat()); fan.position.set(px, 1.9, 4.3); g.add(fan); if (b.inSession) this.spins.push({ mesh: fan, speed: b.star ? 16 : b.fire ? 3 : 8 }); }
      g.add(this.box(1.2, 4.5, 2.2, 0x3a3f45, 5, 0.6, -2.4, { metalness: 0.5, roughness: 0.4 })); g.add(this.gauge(5, 3.6, -1.25, b.fire ? "red" : b.star ? "green" : b.inSession ? "grey" : "grey"));
      g.add(this.light(5, 5.6, -2.4, TONE_COL[b.tone], b.tone !== "grey" || b.inSession));
      // relief tank behind the station: fills when pressure backs up
      const rt = 1.6, rtH = 5;
      g.add(this.cyl(rt, rtH, P.steelDark, -5, 0.6, -2.5, {}, true)); g.add(this.box(0.6, rtH - 0.6, 0.35, P.gunmetal, -5 + rt * 0.7, 0.9, -2.5 + rt * 0.7));
      const relief = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.01, 0.18), emissive(b.fire ? P.amber : P.waterGlow, 1.6)); relief.position.set(-5 + rt * 0.7, 0.9, -2.5 + rt * 0.7 + 0.18); g.add(relief);
      this.fills.push({ water: relief, target: b.fire ? 0.95 : b.inSession ? 0.3 : 0.1, maxH: rtH - 1, base: 0.9 });
      // pipes: from the header down into the station, out the back to the collector
      const inlet = this.pipe([[sx, 2, distZ], [sx, 2, sz - 4.6]], 0.8); this.valveOnPipe(sx, 2, distZ + 5, 0.8);
      const outlet = this.pipe([[sx, 2, sz + 4.6], [sx, 2, collZ]], 0.8);
      const n = b.inSession ? (b.star ? 6 : b.fire ? 2 : 4) : 1;
      for (let k = 0; k < n; k++) { this.addFlow(inlet, k / n, b.inSession ? 0.4 : 0.08, 0.8); this.addFlow(outlet, k / n, b.star ? 0.5 : b.fire ? 0.06 : 0.25, 0.8); }
      if (b.fire) { this.addSteam(new THREE.Vector3(sx - 5, 6.2, sz - 2.5)); this.addBeacon(new THREE.Vector3(sx + 5, 5.6, sz - 2.4), P.red); for (let k = 0; k < 6; k++) this.addFlow(inlet, k / 6, 0.03, 0.8); }
      if (b.star) this.addHalo(new THREE.Vector3(sx, 0.62, sz), 8);
      this.tag(g, { kind: "bay", id: b.repId }); W.add(g);
      // van and excavation site beside the station
      const van = this.makeVan(b.fire ? P.red : b.star ? P.green : P.van, b.inSession, b.name);
      const home = new THREE.Vector3(sx + 11, 0.6, sz + 4);
      if (b.inSession) {
        const site = new THREE.Vector3(sx + 11, 0.6, sz + 12);
        const trench = this.box(7, 0.4, 3.5, P.trench, site.x, -0.35, site.z); W.add(trench);
        const spoil = new THREE.Mesh(new THREE.SphereGeometry(2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), std(P.dirt, { roughness: 1 })); spoil.scale.set(1.5, 0.6, 1); spoil.position.set(site.x + 5.5, 0.6, site.z); spoil.castShadow = true; W.add(spoil);
        for (const dx of [-4.4, 4.4]) { W.add(this.box(0.2, 1, 3.8, P.barrier, site.x + dx, 0.6, site.z)); W.add(this.box(0.2, 0.1, 3.8, 0xffffff, site.x + dx, 1.25, site.z)); }
        const boom = new THREE.Group(); boom.position.set(site.x - 4, 2.2, site.z - 3.5);
        boom.add(this.box(0.5, 0.5, 4.6, P.amber, 0, 0, 2.3));
        const bucket = new THREE.Group(); bucket.position.set(0, 0, 4.6); bucket.add(this.box(0.5, 0.5, 2.6, P.amber, 0, -1.3, 0)); bucket.add(this.box(1.3, 0.9, 1.1, P.gunmetal, 0, -2.8, 0)); boom.add(bucket);
        W.add(this.box(2.2, 1.8, 2.4, P.amber, site.x - 4, 0.6, site.z - 5.5)); W.add(this.box(2.6, 0.7, 3.2, P.tyre, site.x - 4, 0.6, site.z - 5.5)); W.add(boom);
        this.digs.push({ site, boom, bucket, clods: [], next: Math.random() });
        van.position.copy(home); van.rotation.y = Math.PI / 2;
      } else { van.position.copy(home); van.rotation.y = Math.PI; }
      W.add(van);
      this.vans.set(b.repId, { group: van, home: home.clone(), rot: van.rotation.y, busy: false });
      this.labelAnchors.push({ key: `bay:${b.repId}`, pos: new THREE.Vector3(sx, 8.6, sz), short: b.name, title: `${b.name} · advisor station`, tone: b.tone, kind: "bay",
        kpis: [["Status", b.inSession ? "On the tools" : "Off"], ["Today", `${b.callsToday} calls · ${b.bookingsToday} booked`], ["This week", `${b.bookings7d} booked in ${b.hours7d} h`], ["Rate", b.rate7d === null ? "—" : `1 every ${(1 / Math.max(0.01, b.rate7d)).toFixed(1)} h`], ["Pressure", b.fire ? "Backing up" : b.star ? "Clean, high" : "Normal"]] });
    });

    // ================= 3. CLINIC DISTRICT
    const cl = { x: dp.x + dp.w + 16, z: -44, w: 96, d: 88 };
    this.plinth(cl.x, cl.z, cl.w, cl.d, "CLINIC DISTRICT");
    this.clinicRoadX = cl.x + cl.w + 12;
    const clHeaderX = cl.x + 6;
    const toClinics = this.pipe([[dp.x + dp.w - 4, 2, collZ], [clHeaderX, 2, collZ], [clHeaderX, 2, cl.z + 10], [clHeaderX, 2, cl.z + cl.d - 10]], 1.1);
    for (let k = 0; k < Math.min(8, town.todayBooked + 2); k++) this.addFlow(toClinics, k / 8, 0.1, 1.1);
    town.tanks.forEach((t, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const hx = cl.x + 24 + col * 42, hz = cl.z + 20 + row * 34;
      const g = new THREE.Group(); g.position.set(hx, 0.6, hz);
      // two-storey commercial clinic with a glass frontage and roof plant
      g.add(this.box(18, 9, 12, P.wall, 0, 0, 0, { map: concreteTex(), roughness: 0.85 }));
      g.add(this.box(18.6, 0.5, 12.6, P.roof, 0, 9, 0, { map: roofTex(), metalness: 0.4 }));
      g.add(this.box(16, 3.2, 0.4, P.glass, 0, 4.6, 6.05, { transparent: true, opacity: 0.65, roughness: 0.08, metalness: 0.3 }));
      g.add(this.box(16, 2.6, 0.4, P.glass, 0, 0.8, 6.05, { transparent: true, opacity: 0.65, roughness: 0.08, metalness: 0.3 }));
      g.add(this.box(3.2, 3.2, 0.5, P.door, 0, 0, 6.1)); g.add(this.box(18, 0.5, 2.5, P.wallDark, 0, 3.6, 7));
      g.add(this.box(3, 1.4, 3, P.steelDark, -5, 9.5, -2)); g.add(this.box(3, 1.4, 3, P.steelDark, 5, 9.5, -2));
      const csign = textPanel(t.name.toUpperCase(), { w: 12, h: 1.4, font: 0.7, color: "#eef2f6", bg: "#22406a" }); csign.position.set(0, 8, 6.4); g.add(csign);
      g.add(this.box(1.4, 0.4, 0.3, P.green, 0, 6.9, 6.4)); g.add(this.box(0.4, 1.4, 0.3, P.green, 0, 6.4, 6.4));
      // storage tank beside the building
      const tr = 3.4, tankH = 8;
      g.add(this.cyl(tr + 0.8, 0.6, P.concreteDark, 14.5, 0, 0, { map: concreteTex() }));
      g.add(this.cyl(tr, tankH, P.steel, 14.5, 0.6, 0, {}, true));
      for (const y of [0.33, 0.66]) g.add(this.ring(tr + 0.06, 0.12, P.steelDark, 14.5, 0.6 + tankH * y, 0));
      g.add(this.cyl(tr + 0.12, 0.5, P.steelDark, 14.5, 0.6 + tankH, 0));
      g.add(this.box(0.9, tankH - 0.6, 0.5, P.gunmetal, 14.5 - tr * 0.72, 0.9, tr * 0.72));
      const level = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.01, 0.22), emissive(t.fill >= 1 ? P.amber : P.waterGlow, 1.8)); level.position.set(14.5 - tr * 0.72, 1.1, tr * 0.72 + 0.24); g.add(level);
      const fill: Fill = { water: level, target: Math.max(0.02, t.fill), maxH: tankH - 1.1, base: 1.1 }; this.fills.push(fill); this.tankFills.set(t.clinicId, fill);
      const holder = new THREE.Group(); holder.position.set(14.5, 0.6 + tankH + 2.6, 0); holder.rotation.y = Math.PI / 4; g.add(holder);
      this.tankPanels.set(t.clinicId, holder); this.paintTankPanel(t.clinicId, t.delivered, t.packSize);
      g.add(this.valve(9.2, 2, -3.5, t.fill >= 1)); // inlet valve, shut when the pack is full
      g.add(this.light(14.5, 0.6 + tankH + 1.2, 0, t.fill >= 1 ? P.amber : TONE_COL[t.tone], t.fill >= 1 || t.tone !== "grey"));
      const feed = this.pipe([[clHeaderX, 2, hz - 3.5], [hx + 9.2, 2, hz - 3.5], [hx + 14.5, 2, hz - 3.5], [hx + 14.5, 2, hz - tr]], 0.7);
      if (t.fill < 1) for (let k = 0; k < 2; k++) this.addFlow(feed, k / 2, 0.15, 0.7);
      this.tag(g, { kind: "tank", id: t.clinicId }); W.add(g);
      this.tankPos.set(t.clinicId, new THREE.Vector3(hx + 14.5, 0.6, hz + 6));
      if (t.fire) this.addBeacon(new THREE.Vector3(hx, 10.2, hz), P.amber);
      this.labelAnchors.push({ key: `tank:${t.clinicId}`, pos: new THREE.Vector3(hx, 12.2, hz), short: t.name, title: t.name, tone: t.tone, kind: "tank",
        kpis: [["Pack", String(t.packSize)], ["Delivered", String(t.delivered)], ["Remaining", String(t.owed)], ["Tank", `${t.pct}%`], ["Valve", t.fill >= 1 ? "Closed · full" : "Open"], ...(t.refundFails ? [["Refunds failed", `${t.refundFails} · ${t.refundNames.join(", ")}`] as [string, string]] : [])] });
    });

    // ================= 4. METER STATION (finance)
    const fi = { x: dp.x, z: dp.z + dp.d + 22, w: dp.w + 30, d: 42 };
    this.plinth(fi.x, fi.z, fi.w, fi.d, "METER STATION");
    const mx = fi.x + 22, mz = fi.z + fi.d / 2 + 2;
    const meter = new THREE.Group(); meter.position.set(mx, 0.6, mz);
    meter.add(this.box(22, 7, 14, P.wall, 0, 0, 0, { map: concreteTex(), roughness: 0.85 }));
    meter.add(this.box(22.6, 0.6, 14.6, P.roof, 0, 7, 0, { map: roofTex(), metalness: 0.4 }));
    for (let k = 0; k < 3; k++) meter.add(this.cyl(1.2, 3.5, P.steelDark, -7 + k * 7, 7.3, -3, {}, true));
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.6, 40), painted(0x2b3138)); dial.rotation.x = Math.PI / 2; dial.position.set(-5, 4, 7.3); meter.add(dial);
    const needle = this.box(0.25, 2.4, 0.2, P.red, -5, 4, 7.65); needle.rotation.z = town.profit >= 0 ? -0.9 : 0.9; meter.add(needle);
    const readout = textPanel(`${town.rangeLabel.toUpperCase()}   IN $${Math.round(town.totalRevenue).toLocaleString()}   OUT $${Math.round(town.totalCost).toLocaleString()}`, { w: 12, h: 1.4, font: 0.6, mono: true, color: town.profit >= 0 ? "#8ff0c8" : "#ffc48a" }); readout.position.set(4.5, 4.4, 7.05); meter.add(readout);
    const msign = textPanel("METER STATION · FINANCE", { w: 12, h: 1.2, font: 0.7, color: "#eef2f6", bg: "#22406a" }); msign.position.set(4.5, 6.2, 7.05); meter.add(msign);
    this.tag(meter, { kind: "meter", id: "meter" }); W.add(meter);
    // revenue main from the clinic district down the road into the meter
    const revenue = this.pipe([[clHeaderX, 2, cl.z + cl.d - 10], [clHeaderX, 2, fi.z - 6], [mx + 11, 2, fi.z - 6], [mx + 11, 2, mz - 7]], 1.1);
    for (let k = 0; k < Math.max(1, Math.min(8, Math.round(town.totalRevenue / 800))); k++) this.addFlow(revenue, k / 8, 0.12, 1.1);
    this.labelAnchors.push({ key: "meter", pos: new THREE.Vector3(mx, 12, mz), short: "Meter station", title: `Meter station · ${town.rangeLabel}`, tone: town.profit >= 0 ? "green" : "amber", kind: "meter", kpis: [["Revenue", $(town.totalRevenue)], ["Cost", $(town.totalCost)], ["Net", `${town.profit < 0 ? "−" : "+"}${$(Math.abs(town.profit))}`]] });
    town.puddles.forEach((p, i) => {
      const px = mx + 22 + i * 16, pz = mz + 4;
      const cab = new THREE.Group(); cab.position.set(px, 0.6, pz);
      cab.add(this.box(4, 4.2, 2.4, 0x3a3f45, 0, 0, 0, { metalness: 0.5, roughness: 0.45 })); cab.add(this.gauge(0, 3, 1.25, p.star ? "green" : p.tone === "red" ? "amber" : "grey"));
      cab.add(this.light(0, 4.9, 0, p.star ? P.green : p.tone === "red" ? P.amber : P.grey, p.tone !== "grey"));
      this.pipe([[mx + 11, 2, mz - 4], [px, 2, mz - 4], [px, 2, pz - 1.2]], 0.5);
      const plate = textPanel(p.city.toUpperCase(), { w: 4, h: 0.9, font: 0.5, color: "#eef2f6", bg: "#22406a" }); plate.position.set(0, 1, 1.22); cab.add(plate);
      this.tag(cab, { kind: "puddle", id: p.city }); W.add(cab);
      if (p.tone === "red") this.addLeak(new THREE.Vector3(px + 1.8, 1.4, pz + 0.8), new THREE.Vector3(0.6, -1, 0.8));
      if (p.star) this.addHalo(new THREE.Vector3(px, 0.62, pz), 4);
      this.labelAnchors.push({ key: `puddle:${p.city}`, pos: new THREE.Vector3(px, 7, pz), short: p.city, title: `${p.city} · ${town.rangeLabel}`, tone: p.tone, kind: "puddle", kpis: [["Revenue", $(p.revenue)], ["Cost", $(p.cost)], ["Net", `${p.profit < 0 ? "−" : "+"}${$(Math.abs(p.profit))}`], ["Status", p.star ? "Profitable" : p.tone === "red" ? "Leaking" : "No shows yet"]] });
    });

    // ================= roads, poles, scenery
    road(this.scenery, dp.x - 10, this.roadZ, this.clinicRoadX, this.roadZ, 9);
    road(this.scenery, this.clinicRoadX, this.roadZ, this.clinicRoadX, cl.z - 8, 9);
    for (const [, p] of this.tankPos) road(this.scenery, p.x + 4, p.z + 2, this.clinicRoadX, p.z + 2, 5);
    for (const [x, z] of [[dp.x - 8, this.roadZ - 7], [dp.x + dp.w / 2, this.roadZ - 7], [this.clinicRoadX - 7, this.roadZ - 7], [this.clinicRoadX - 7, cl.z + 24], [this.clinicRoadX - 7, cl.z + 64]]) this.lightPole(x, z);
    for (const [x, z] of [[aq.x - 8, aq.z + 12], [aq.x - 8, aq.z + 60], [cl.x + cl.w + 20, cl.z + 4], [fi.x + fi.w + 8, fi.z + 8], [aq.x + 20, aq.z + aq.d + 10], [fi.x - 10, fi.z + 30]]) this.tree(x, z);
    this.shippingContainer(dp.x + dp.w - 20, dp.z + 4, P.navy); this.shippingContainer(dp.x + dp.w - 20, dp.z + 8, 0x8a5a3a); this.shippingContainer(cl.x + cl.w - 16, cl.z + 4, P.steelDark);
    this.fitCamera();
  }

  deliverBooking(repId: string | null, clinicId: string | null) {
    const van = (repId && this.vans.get(repId)) || [...this.vans.values()].find((v) => !v.busy) || null;
    if (!van || van.busy) return;
    const id = clinicId && this.tankPos.has(clinicId) ? clinicId : [...this.tankPos.keys()][0];
    const dest = id ? this.tankPos.get(id) : null;
    if (!dest || !id) return;
    const from = van.group.position.clone();
    const pts = [from, new THREE.Vector3(from.x, 0.6, this.roadZ), new THREE.Vector3(this.clinicRoadX, 0.6, this.roadZ), new THREE.Vector3(this.clinicRoadX, 0.6, dest.z + 2), new THREE.Vector3(dest.x + 4, 0.6, dest.z + 2)];
    van.busy = true;
    this.trips.push({ van, curve: new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.05), t: 0, speed: 0.2, phase: "out", clinicId: id, crate: null, dropT: 0, puffT: 0 });
  }
  setTankFill(clinicId: string, delivered: number, packSize: number) {
    const f = this.tankFills.get(clinicId); if (f) f.target = Math.max(0.02, packSize > 0 ? Math.min(1, delivered / packSize) : 0);
    this.paintTankPanel(clinicId, delivered, packSize);
  }
  focus(target: PickTarget | null) {
    const key = target ? (target.kind === "depot" || target.kind === "meter" ? target.kind : `${target.kind}:${target.id}`) : null;
    const a = key ? this.labelAnchors.find((l) => l.key === key) : null;
    const look = a ? new THREE.Vector3(a.pos.x, 0, a.pos.z) : this.center.clone();
    this.camera.position.copy(look).add(CAM_OFFSET); this.camera.lookAt(look);
    this.zoomTarget = target ? 0.6 : 1;
  }
  dispose() {
    this.disposed = true; cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
    this.renderer.domElement.removeEventListener("pointermove", this.onMove);
    this.renderer.domElement.removeEventListener("click", this.onClick);
    this.clearTown(); this.renderer.dispose(); this.renderer.domElement.parentNode?.removeChild(this.renderer.domElement);
  }

  // ======================================================== parts
  private setNight(night: boolean) { this.sun.intensity = night ? 0.8 : 2.4; this.sun.color.set(night ? 0x9fb4e0 : 0xfff1dd); this.scene.background = new THREE.Color(night ? 0x2a3444 : P.sky); (this.scene.fog as THREE.Fog).color.set(night ? 0x2a3444 : P.sky); this.renderer.toneMappingExposure = night ? 0.9 : 1.1; }
  private buildGround() { const g = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), std(P.grass, { roughness: 1, map: grassTex() })); g.rotation.x = -Math.PI / 2; g.receiveShadow = true; this.scene.add(g); }
  private plinth(x: number, z: number, w: number, d: number, title: string) {
    const base = this.box(w, 0.6, d, P.concrete, x + w / 2, 0, z + d / 2, { map: concreteTex(), roughness: 0.9 }); this.scenery.add(base);
    const kerb = new THREE.Mesh(new THREE.BoxGeometry(w + 1.4, 0.4, d + 1.4), std(P.kerb, { roughness: 0.85 })); kerb.position.set(x + w / 2, 0.2, z + d / 2); kerb.receiveShadow = true; this.scenery.add(kerb);
    const t = textPanel(title, { w: Math.min(w - 6, 56), h: 6.5, font: 3.6, color: "#eef2f6", bg: "#4f5964", mono: true }); t.rotation.x = -Math.PI / 2; t.rotation.z = Math.PI / 4; t.position.set(x + w / 2, 0.62, z + d - 9); this.scenery.add(t);
  }
  private clearTown() {
    for (const f of this.flows) this.scene.remove(f.ring);
    this.world.clear(); this.scenery.clear(); this.fx.clear();
    this.pickables = []; this.flows = []; this.fills = []; this.tankFills.clear(); this.tankPanels.clear(); this.leaks = []; this.beacons = []; this.steams = []; this.spins = []; this.halos = []; this.digs = []; this.vans.clear(); this.trips = []; this.puffs = []; this.tankPos.clear(); this.labelAnchors = []; this.hovered = null;
  }
  private tag(o: THREE.Object3D, t: PickTarget) { o.userData = t; this.pickables.push(o); }
  private box(w: number, h: number, d: number, c: number, x: number, y: number, z: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), std(c, extra)); m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true; return m; }
  private cyl(r: number, h: number, c: number, x: number, y: number, z: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}, steel = false) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 40), steel ? steelMat(c) : std(c, extra)); m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true; return m; }
  private ring(r: number, t: number, c: number, x: number, y: number, z: number, upright = false) { const m = new THREE.Mesh(new THREE.TorusGeometry(r, t, 10, 48), std(c, { roughness: 0.45, metalness: 0.7 })); if (!upright) m.rotation.x = Math.PI / 2; else m.rotation.y = Math.PI / 2; m.position.set(x, y, z); m.castShadow = true; return m; }
  private disc(r: number, c: number, x: number, z: number, y: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 48), std(c, extra)); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; return m; }
  /** Painted steel pipe with flanges at every fitting and concrete supports along the run. */
  private pipe(points: [number, number, number][], r: number, supports = true) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, "catmullrom", 0);
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(8, points.length * 24), r, 18, false), painted(P.pipe)); m.castShadow = true; m.receiveShadow = true; this.world.add(m);
    for (const p of points) { const f = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.32, r + 0.32, 0.55, 20), std(P.flange, { metalness: 0.7, roughness: 0.4 })); f.position.set(p[0], p[1], p[2]); const nxt = points[Math.min(points.length - 1, points.indexOf(p) + 1)]; const dx = nxt[0] - p[0], dz = nxt[2] - p[2]; f.rotation.z = Math.abs(dx) >= Math.abs(dz) ? Math.PI / 2 : 0; f.rotation.x = Math.abs(dx) >= Math.abs(dz) ? 0 : Math.PI / 2; f.castShadow = true; this.world.add(f); }
    if (supports) { const len = curve.getLength(); const n = Math.max(1, Math.floor(len / 12)); for (let i = 1; i <= n; i++) { const p = curve.getPoint(i / (n + 1)); this.world.add(this.box(1.4, p.y - r, 1.4, P.concreteDark, p.x, 0.6, p.z, { map: concreteTex() })); } }
    return curve;
  }
  /** Gate valve on a pipe run: body, bonnet and handwheel. */
  private valveOnPipe(x: number, y: number, z: number, r: number) {
    const g = new THREE.Group(); g.position.set(x, y, z);
    g.add(this.cyl(r + 0.5, 1.6, P.pipeDark, 0, -0.8, 0, { metalness: 0.6, roughness: 0.4 }).rotateZ(Math.PI / 2));
    g.add(this.cyl(0.32, 1.6, P.steelDark, 0, r - 0.2, 0, {}, true));
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.12, 8, 24), painted(P.red)); wheel.rotation.x = Math.PI / 2; wheel.position.y = r + 1.5; g.add(wheel);
    this.world.add(g);
  }
  /** Standalone valve at a station inlet; red = shut. */
  private valve(x: number, y: number, z: number, closed: boolean) {
    const g = new THREE.Group(); g.position.set(x, y, z);
    g.add(this.cyl(0.9, 1.6, P.pipeDark, 0, -0.8, 0, { metalness: 0.6, roughness: 0.4 }).rotateZ(Math.PI / 2));
    g.add(this.cyl(0.28, 1.4, P.steelDark, 0, 0.5, 0, {}, true));
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.11, 8, 24), painted(closed ? P.red : P.steel)); wheel.rotation.x = closed ? 0 : Math.PI / 2; wheel.position.y = 1.9; g.add(wheel);
    if (closed) { const sign = textPanel("CLOSED", { w: 2.2, h: 0.7, font: 0.4, color: "#ffd6d0", bg: "#7a2a22" }); sign.position.set(0, 3.1, 0); sign.rotation.y = Math.PI / 4; g.add(sign); }
    return g;
  }
  /** Round pressure gauge with a needle in the green, amber or red zone. */
  private gauge(x: number, y: number, z: number, zone: "green" | "amber" | "red" | "grey") {
    const g = new THREE.Group(); g.position.set(x, y, z);
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.25, 24), std(0xe8ebee, { roughness: 0.3 })); face.rotation.x = Math.PI / 2; g.add(face);
    g.add(this.ring(0.78, 0.08, P.steelDark, 0, 0, 0, false).rotateX(0));
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.07, 6, 20, Math.PI * 0.6), emissive(zone === "grey" ? P.grey : TONE_COL[zone], 1.2)); arc.position.z = 0.14; arc.rotation.z = zone === "red" ? -0.4 : zone === "amber" ? 0.4 : 1.6; g.add(arc);
    const needle = this.box(0.08, 0.6, 0.06, 0x202428, 0, 0, 0.16); needle.rotation.z = zone === "red" ? -1.2 : zone === "amber" ? -0.3 : zone === "green" ? 0.8 : 1.4; g.add(needle);
    return g;
  }
  private light(x: number, y: number, z: number, color: number, on: boolean) {
    const g = new THREE.Group(); g.position.set(x, y, z);
    g.add(this.cyl(0.32, 0.4, P.gunmetal, 0, 0, 0));
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), on ? emissive(color, 2.4) : std(color, { roughness: 0.3 })); dome.position.y = 0.55; g.add(dome);
    if (on) { const s = sprite(glowTex(), color, 0.55, true); s.scale.set(2.4, 2.4, 1); s.position.y = 0.55; g.add(s); }
    return g;
  }
  private makeVan(color: number, lightsOn: boolean, name: string) {
    const g = new THREE.Group();
    g.add(this.box(3.4, 2.7, 6.4, color, 0, 0.55, -0.6, { roughness: 0.3, metalness: 0.35 }));
    g.add(this.box(3.4, 2.1, 2.4, color, 0, 0.55, 3.8, { roughness: 0.3, metalness: 0.35 }));
    g.add(this.box(3.2, 1, 0.2, 0x1f2a36, 0, 1.75, 5.05, { roughness: 0.05, metalness: 0.6 }));
    g.add(this.box(0.2, 0.8, 5.6, 0x1f2a36, 1.71, 1.9, -0.6, { roughness: 0.05, metalness: 0.6 }));
    g.add(this.box(3.42, 0.35, 6.42, P.vanTrim, 0, 1.55, -0.6));
    for (const s of [1, -1]) { const t = textPanel(name.toUpperCase(), { w: 3.2, h: 0.9, font: 0.5, color: "#eef2f6", bg: "#22406a" }); t.position.set(s * 1.72, 1.2, -0.6); t.rotation.y = s * Math.PI / 2; g.add(t); }
    g.add(this.box(3, 0.15, 5, P.steelDark, 0, 3.25, -0.4)); for (let i = 0; i < 4; i++) g.add(this.box(3, 0.1, 0.15, P.steel, 0, 3.4, -2.6 + i * 1.5));
    const lamp = emissive(0xfff1cf, lightsOn ? 2.5 : 0.1); for (const s of [1, -1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 0.15), lamp); l.position.set(s * 1.1, 1.3, 5.05); g.add(l); }
    for (const [wx, wz] of [[-1.7, 2.3], [1.7, 2.3], [-1.7, -2.3], [1.7, -2.3]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.5, 20), std(P.tyre, { roughness: 0.9 })); w.rotation.z = Math.PI / 2; w.position.set(wx, 0.7, wz); w.castShadow = true; g.add(w); const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.52, 12), steelMat()); hub.rotation.z = Math.PI / 2; hub.position.set(wx, 0.7, wz); g.add(hub); }
    return g;
  }
  private lightPole(x: number, z: number) {
    this.scenery.add(this.cyl(0.2, 10, P.gunmetal, x, 0, z)); this.scenery.add(this.box(2.4, 0.2, 0.3, P.gunmetal, x + 1.1, 9.8, z));
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 0.5), emissive(0xffe9c4, 1.4)); head.position.set(x + 2.2, 9.7, z); this.scenery.add(head);
  }
  private tree(x: number, z: number) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    g.add(this.cyl(0.35, 2, 0x6b4f37, 0, 0, 0)); const c1 = new THREE.Mesh(new THREE.SphereGeometry(2.6, 14, 12), std(0x4f7a45, { roughness: 1 })); c1.position.y = 4; c1.castShadow = true; g.add(c1); const c2 = new THREE.Mesh(new THREE.SphereGeometry(1.9, 14, 12), std(0x446b3c, { roughness: 1 })); c2.position.set(1.3, 5.2, 0.7); c2.castShadow = true; g.add(c2);
    this.scenery.add(g);
  }
  private shippingContainer(x: number, z: number, c: number) { this.scenery.add(this.box(12, 2.6, 2.6, c, x, 0.6, z, { roughness: 0.55, metalness: 0.4, map: roofTex() })); }
  private paintTankPanel(clinicId: string, delivered: number, packSize: number) {
    const holder = this.tankPanels.get(clinicId); if (!holder) return; holder.clear();
    const pct = packSize > 0 ? Math.round(Math.min(1, delivered / packSize) * 100) : 0;
    holder.add(textPanel(`${delivered} / ${packSize}\n${pct}% FULL`, { w: 6, h: 3, font: 1, mono: true, color: pct >= 100 ? "#ffc48a" : "#8fdcff" }));
    holder.add(this.box(6.4, 3.4, 0.3, P.gunmetal, 0, -1.7, -0.2)); holder.add(this.box(0.3, 3, 0.3, P.gunmetal, 0, -4.7, -0.2));
  }
  private addFlow(curve: THREE.Curve<THREE.Vector3>, t: number, speed: number, r: number) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r + 0.12, 0.16, 8, 28), new THREE.MeshBasicMaterial({ color: P.waterGlow, transparent: true, opacity: 0.9, toneMapped: false })); this.scene.add(ring); this.flows.push({ ring, curve, t, speed });
  }
  private addLeak(at: THREE.Vector3, dir: THREE.Vector3) {
    const puddle = this.disc(0.5, P.water, at.x + dir.x * 2, at.z + dir.z * 2, 0.64, { transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.5 }); this.fx.add(puddle);
    this.leaks.push({ at, dir: dir.clone().normalize(), drops: [], next: 0, puddle });
  }
  private addBeacon(pos: THREE.Vector3, color: number) {
    const g = new THREE.Group(); g.position.copy(pos);
    g.add(this.cyl(0.4, 0.5, P.gunmetal, 0, 0, 0)); const dome = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 10), emissive(color, 2.5)); dome.position.y = 0.7; g.add(dome);
    const glow = sprite(glowTex(), color, 0.8, true); glow.scale.set(5, 5, 1); glow.position.y = 0.7; g.add(glow);
    this.fx.add(g); this.beacons.push({ dome, glow, phase: Math.random() * 6, color });
  }
  private addSteam(at: THREE.Vector3) { this.steams.push({ at, puffs: [], next: 0 }); }
  private addHalo(pos: THREE.Vector3, r: number) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.3, r, 64), new THREE.MeshBasicMaterial({ color: P.green, transparent: true, opacity: 0.55, side: THREE.DoubleSide, toneMapped: false })); ring.rotation.x = -Math.PI / 2; ring.position.copy(pos); this.fx.add(ring); this.halos.push({ ring, phase: Math.random() * 6 });
  }

  // ======================================================== camera + input
  private fitCamera() {
    const bounds = new THREE.Box3().setFromObject(this.world);
    if (bounds.isEmpty()) return;
    this.center = bounds.getCenter(new THREE.Vector3()); this.center.y = 0;
    this.camera.position.copy(this.center).add(CAM_OFFSET); this.camera.lookAt(this.center); this.camera.updateMatrixWorld();
    const inv = this.camera.matrixWorldInverse;
    const w = this.container.clientWidth || 1440, h = this.container.clientHeight || 900;
    const PANEL = w > 1000 ? Math.round(w * 0.21) + 12 : 0, HUD = 74;
    const aspect = w / h, usable = Math.max(1, (w - PANEL) / (h - HUD));
    let need = 1; const c = [bounds.min, bounds.max];
    for (const cx of [0, 1]) for (const cy of [0, 1]) for (const cz of [0, 1]) { const v = new THREE.Vector3(c[cx].x, c[cy].y, c[cz].z).applyMatrix4(inv); need = Math.max(need, Math.abs(v.x) / usable, Math.abs(v.y)); }
    this.baseFs = need * 1.0 * (h / (h - HUD));
    const pxToWorld = (2 * this.baseFs * aspect) / w;
    const right = new THREE.Vector3(1, 0, -1).normalize(), down = new THREE.Vector3(-1, 0, -1).normalize();
    this.center.add(right.multiplyScalar((PANEL / 2) * pxToWorld)).add(down.multiplyScalar((HUD / 2) * pxToWorld * 1.3));
    this.camera.position.copy(this.center).add(CAM_OFFSET); this.camera.lookAt(this.center);
    this.resize();
  }
  private resize = () => { const w = this.container.clientWidth || 1, h = this.container.clientHeight || 1; this.renderer.setSize(w, h, false); const fs = this.baseFs * this.zoom, aspect = w / h; this.camera.left = -fs * aspect; this.camera.right = fs * aspect; this.camera.top = fs; this.camera.bottom = -fs; this.camera.updateProjectionMatrix(); };
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
    for (const f of this.flows) { f.t = (f.t + f.speed * dt) % 1; const p = f.curve.getPoint(f.t), q = f.curve.getPoint(Math.min(1, f.t + 0.01)); f.ring.position.copy(p); f.ring.lookAt(q); }
    for (const f of this.fills) { const cur = f.water.scale.y * 0.01; const next = cur + (f.target * f.maxH - cur) * Math.min(1, dt * 1.6); f.water.scale.y = Math.max(0.01, next) / 0.01; f.water.position.y = f.base + next / 2; }
    for (const s of this.spins) s.mesh.rotation.z += dt * s.speed;
    for (const b of this.beacons) { const k = (Math.sin(t * 6 + b.phase) + 1) / 2; b.glow.material.opacity = 0.15 + 0.75 * k; b.glow.scale.setScalar(3.5 + 3 * k); (b.dome.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6 + 2.4 * k; }
    for (const h of this.halos) { (h.ring.material as THREE.MeshBasicMaterial).opacity = 0.35 + 0.3 * Math.sin(t * 1.6 + h.phase); h.ring.rotation.z = t * 0.25; }
    for (const l of this.leaks) {
      l.next -= dt;
      if (l.next <= 0) { l.next = 0.07; const s = sprite(dropTex(), 0xffffff, 0.9); s.scale.set(0.5, 0.5, 1); s.position.copy(l.at); this.fx.add(s); l.drops.push({ s, v: l.dir.clone().multiplyScalar(6).add(new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2)), life: 1 }); }
      for (const d of [...l.drops]) { d.life -= dt * 1.4; d.v.y -= 16 * dt; d.s.position.addScaledVector(d.v, dt); if (d.s.position.y < 0.7 || d.life <= 0) { this.fx.remove(d.s); l.drops = l.drops.filter((x) => x !== d); } }
      const k = Math.min(3.2, l.puddle.scale.x + dt * 0.25); l.puddle.scale.set(k, k, 1);
    }
    for (const s of this.steams) {
      s.next -= dt;
      if (s.next <= 0) { s.next = 0.12; const p = sprite(steamTex(), 0xffffff, 0.6); p.scale.set(1.2, 1.2, 1); p.position.copy(s.at); this.fx.add(p); s.puffs.push({ s: p, life: 1 }); }
      for (const p of [...s.puffs]) { p.life -= dt * 0.7; p.s.position.y += dt * 4; p.s.position.x += dt * 0.6; p.s.scale.addScalar(dt * 2.5); p.s.material.opacity = 0.6 * Math.max(0, p.life); if (p.life <= 0) { this.fx.remove(p.s); s.puffs = s.puffs.filter((x) => x !== p); } }
    }
    for (const d of this.digs) {
      d.boom.rotation.x = -0.35 + Math.sin(t * 1.4) * 0.3; d.bucket.rotation.x = 0.6 + Math.sin(t * 1.4 + 1) * 0.5;
      d.next -= dt;
      if (d.next <= 0) { d.next = 0.6 + Math.random() * 0.5; const c = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32), std(P.dirt, { roughness: 1 })); c.position.set(d.site.x - 1, 2, d.site.z); this.fx.add(c); d.clods.push({ mesh: c, v: new THREE.Vector3(4 + Math.random() * 2, 4 + Math.random() * 2, (Math.random() - 0.5) * 2), life: 1.2 }); }
      for (const c of [...d.clods]) { c.life -= dt; c.v.y -= 14 * dt; c.mesh.position.addScaledVector(c.v, dt); if (c.life <= 0 || c.mesh.position.y < 0.6) { this.fx.remove(c.mesh); d.clods = d.clods.filter((x) => x !== c); } }
    }
    for (const trip of [...this.trips]) this.stepTrip(trip, dt);
    for (const p of [...this.puffs]) { p.life -= dt * 0.9; p.s.position.y += dt * 1.2; p.s.scale.addScalar(dt * 1.2); p.s.material.opacity = 0.5 * Math.max(0, p.life); if (p.life <= 0) { this.fx.remove(p.s); this.puffs = this.puffs.filter((x) => x !== p); } }

    const hit = this.pickAt();
    if (hit !== this.hovered) { this.hovered = hit; this.renderer.domElement.style.cursor = hit ? "pointer" : "default"; }
    this.renderer.render(this.scene, this.camera);
    if (this.opts.onLabels) {
      const w = this.container.clientWidth, h = this.container.clientHeight;
      const hv = this.hovered?.userData as PickTarget | undefined;
      const hoverKey = hv ? (hv.kind === "depot" || hv.kind === "meter" ? hv.kind : `${hv.kind}:${hv.id}`) : null;
      this.opts.onLabels(this.labelAnchors.map((a) => { const v = a.pos.clone().project(this.camera); return { key: a.key, x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h, short: a.short, title: a.title, kpis: a.kpis, tone: a.tone, hidden: v.z > 1, active: a.key === hoverKey, kind: a.kind }; }));
    }
  };
  private stepTrip(trip: Trip, dt: number) {
    const g = trip.van.group;
    if (trip.phase === "drop") {
      trip.dropT += dt;
      const dest = this.tankPos.get(trip.clinicId);
      if (trip.crate && dest) {
        const k = Math.min(1, trip.dropT / 1.1);
        trip.crate.position.lerpVectors(new THREE.Vector3(g.position.x, 3, g.position.z), new THREE.Vector3(dest.x, 9.6, dest.z - 6), k); trip.crate.position.y += Math.sin(k * Math.PI) * 7; trip.crate.rotation.y += dt * 5;
        if (k >= 1) { this.fx.remove(trip.crate); trip.crate = null; const splash = sprite(glowTex(), P.waterGlow, 0.9, true); splash.scale.set(4, 4, 1); splash.position.set(dest.x, 9.4, dest.z - 6); this.fx.add(splash); this.puffs.push({ s: splash, life: 1 }); }
      }
      if (trip.dropT > 2) { trip.phase = "back"; const home = trip.van.home; trip.curve = new THREE.CatmullRomCurve3([g.position.clone(), new THREE.Vector3(this.clinicRoadX, 0.6, g.position.z), new THREE.Vector3(this.clinicRoadX, 0.6, this.roadZ), new THREE.Vector3(home.x, 0.6, this.roadZ), home.clone()], false, "catmullrom", 0.05); trip.t = 0; trip.speed = 0.15; }
      return;
    }
    trip.t += dt * trip.speed; trip.puffT -= dt;
    if (trip.puffT <= 0) { trip.puffT = 0.15; const s = sprite(steamTex(), 0xd8dde2, 0.5); s.scale.set(1.4, 1.4, 1); s.position.set(g.position.x, 1.4, g.position.z); this.fx.add(s); this.puffs.push({ s, life: 1 }); }
    if (trip.t >= 1) {
      if (trip.phase === "out") { trip.phase = "drop"; trip.dropT = 0; const crate = this.box(1.5, 1.5, 1.5, P.navy, g.position.x, 3, g.position.z); this.fx.add(crate); trip.crate = crate; }
      else { g.position.copy(trip.van.home); g.rotation.y = trip.van.rot; trip.van.busy = false; this.trips = this.trips.filter((x) => x !== trip); }
      return;
    }
    const p = trip.curve.getPoint(trip.t), ahead = trip.curve.getPoint(Math.min(1, trip.t + 0.01));
    g.position.set(p.x, 0.6, p.z); g.rotation.y = Math.atan2(ahead.x - p.x, ahead.z - p.z);
  }
}

function road(parent: THREE.Object3D, x1: number, z1: number, x2: number, z2: number, w: number) {
  const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz); if (len < 1) return;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(len, w), std(P.asphalt, { roughness: 0.95, map: asphaltTex() })); m.rotation.x = -Math.PI / 2; m.rotation.z = -Math.atan2(dz, dx); m.position.set((x1 + x2) / 2, 0.05, (z1 + z2) / 2); m.receiveShadow = true; parent.add(m);
  const n = Math.floor(len / 6);
  for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; const l = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.25), new THREE.MeshBasicMaterial({ color: 0xd9dde2 })); l.rotation.x = -Math.PI / 2; l.rotation.z = -Math.atan2(dz, dx); l.position.set(x1 + dx * t, 0.06, z1 + dz * t); parent.add(l); }
}
