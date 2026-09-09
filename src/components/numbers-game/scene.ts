import * as THREE from "three";
import type { Town, Tone } from "./model";

/**
 * The plumbing town, drawn with three.js. Takes a Town (see model.ts) and
 * keeps the picture in step with it: water levels ease to their new height,
 * beads run down the pipes, vans drive out to the clinics when a booking
 * lands, smoke drifts off tired ad towers, and puddles ripple.
 *
 * Everything clickable carries userData = { kind, id } so the page can open
 * that thing's numbers.
 */

export type PickTarget = { kind: "tower" | "bay" | "tank" | "clog" | "puddle" | "depot" | "meter"; id: string };

export type LabelSpec = { key: string; x: number; y: number; title: string; sub: string; tone: Tone; hidden: boolean };

type Opts = {
  onPick?: (t: PickTarget | null) => void;
  onLabels?: (labels: LabelSpec[]) => void;
};

const COL = {
  grass: 0x9ad57f, grassDark: 0x7fc26a, path: 0xf3dfb0, road: 0xb9bfc7, roadLine: 0xfff7d6,
  sky: 0xc8ecff, skyNight: 0x131a33,
  wall: 0xfff6e8, wallB: 0xf4e3c8, roofRed: 0xe8543f, roofBlue: 0x3d84f5, roofOrange: 0xf5a623, roofTeal: 0x2bb5a0,
  legs: 0x5c6b7a, glass: 0xdff3ff, water: 0x2f9bff, waterDeep: 0x1f7be0,
  pipe: 0xaab4c0, pipeDark: 0x8593a1, crate: 0x3d84f5, clog: 0x8e4a1f,
  red: 0xef4b3d, amber: 0xf5a623, green: 0x2fc46e, grey: 0xb8c0c9,
  tree: 0x4fb35c, treeDark: 0x3a9a4b, trunk: 0x8d6a4a, puddle: 0x63b3ff, window: 0xffd27a,
};
const TONE_COL: Record<Tone, number> = { red: COL.red, amber: COL.amber, green: COL.green, grey: COL.grey };

// Cel-shaded material with a 3-step ramp: the "mobile game" look.
let ramp: THREE.DataTexture | null = null;
function toonRamp() {
  if (ramp) return ramp;
  const data = new Uint8Array([120, 120, 120, 255, 190, 190, 190, 255, 255, 255, 255, 255]);
  ramp = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  ramp.minFilter = THREE.NearestFilter; ramp.magFilter = THREE.NearestFilter; ramp.needsUpdate = true;
  return ramp;
}
const mat = (color: number, extra: Partial<THREE.MeshToonMaterialParameters> = {}) =>
  new THREE.MeshToonMaterial({ color, gradientMap: toonRamp(), ...extra });

type Bead = { mesh: THREE.Mesh; curve: THREE.Curve<THREE.Vector3>; t: number; speed: number };
type Drive = { group: THREE.Group; curve: THREE.CatmullRomCurve3; t: number; home: THREE.Vector3; homeRot: number };
type Anim = { water: THREE.Mesh; target: number; maxH: number; base: number };

export class TownScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.OrthographicCamera;
  private container: HTMLElement;
  private opts: Opts;
  private raf = 0;
  private clock = new THREE.Clock();
  private townGroup = new THREE.Group();
  private scenery = new THREE.Group();
  private pickables: THREE.Object3D[] = [];
  private beads: Bead[] = [];
  private drives: Drive[] = [];
  private smoke: { mesh: THREE.Mesh; base: THREE.Vector3; phase: number }[] = [];
  private puddles: { mesh: THREE.Mesh; phase: number; scale: number }[] = [];
  private fills: Anim[] = [];
  private clogMeshes: THREE.Mesh[] = [];
  private labelAnchors: { key: string; pos: THREE.Vector3; title: string; sub: string; tone: Tone }[] = [];
  private vans = new Map<string, { group: THREE.Group; home: THREE.Vector3; rot: number }>();
  private tankPos = new Map<string, THREE.Vector3>();
  private hovered: THREE.Object3D | null = null;
  private night = false;
  private windowMats: THREE.MeshToonMaterial[] = [];
  private sun: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(-2, -2);
  private disposed = false;

  constructor(container: HTMLElement, opts: Opts = {}) {
    this.container = container;
    this.opts = opts;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = "block";

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -300, 600);
    this.camera.position.set(52, 60, 52);
    this.camera.lookAt(-12, 0, -12);

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x8fbf7a, 0.7);
    this.scene.add(this.hemi);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.2));
    this.sun = new THREE.DirectionalLight(0xffffff, 1.1);
    this.sun.position.set(50, 80, 10);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -110, right: 110, top: 110, bottom: -110, near: 1, far: 300 });
    this.sun.shadow.bias = -0.0006;
    this.scene.add(this.sun);
    this.scene.background = new THREE.Color(COL.sky);
    this.scene.add(this.townGroup);
    this.scene.add(this.scenery);
    this.buildGround();

    this.renderer.domElement.addEventListener("pointermove", this.onMove);
    this.renderer.domElement.addEventListener("click", this.onClick);
    window.addEventListener("resize", this.resize);
    this.resize();
    this.loop();
  }

  // ---------- public
  setTown(town: Town) {
    this.clearTown();
    this.setNight(town.hour < 7 || town.hour >= 19);
    const T = this.townGroup;

    // ===== Water towers (ads), two columns on the left
    town.towers.forEach((tw, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = -70 + col * 24, z = -34 + row * 20;
      const legH = 8 + tw.fill * 8;
      const g = new THREE.Group(); g.position.set(x, 0, z);
      for (const [dx, dz] of [[-2.3, -2.3], [2.3, -2.3], [-2.3, 2.3], [2.3, 2.3]]) g.add(this.box(0.7, legH, 0.7, COL.legs, dx, 0, dz));
      g.add(this.box(1.2, 0.5, 5.4, COL.legs, 0, legH * 0.5, 0)); g.add(this.box(5.4, 0.5, 1.2, COL.legs, 0, legH * 0.5, 0));
      g.add(this.box(7, 0.6, 7, COL.legs, 0, legH, 0));
      const tankH = 6, r = 3.4;
      const water = this.cyl(r - 0.25, 0.01, tw.leads > 0 ? COL.water : COL.grey, 0, legH + 0.6, 0);
      g.add(water);
      this.fills.push({ water, target: Math.max(0.05, tw.fill), maxH: tankH - 0.3, base: legH + 0.6 });
      g.add(this.cyl(r, tankH, COL.glass, 0, legH + 0.6, 0, { transparent: true, opacity: 0.35 }));
      g.add(this.torus(r + 0.1, 0.18, COL.legs, 0, legH + 1.2, 0)); g.add(this.torus(r + 0.1, 0.18, COL.legs, 0, legH + 5.6, 0));
      const roof = new THREE.Mesh(new THREE.ConeGeometry(r + 0.7, 2.4, 28), mat(COL.roofRed)); roof.position.set(0, legH + 0.6 + tankH + 1.2, 0); roof.castShadow = true; g.add(roof);
      const pipe = this.cyl(0.45, legH + 1, COL.pipe, 0, 0, r + 0.6); g.add(pipe);
      g.add(this.disc(1.6, TONE_COL[tw.tone], 0, r + 0.6, 0.06));
      if (tw.smoke) for (let k = 0; k < 4; k++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.8 + k * 0.35, 12, 10), mat(0xd7dde3, { transparent: true, opacity: 0.6 - k * 0.1 }));
        const base = new THREE.Vector3(x + k * 0.6, legH + tankH + 3.6 + k * 1.5, z - k * 0.4);
        s.position.copy(base); this.scene.add(s); this.smoke.push({ mesh: s, base, phase: k * 0.9 });
      }
      this.tag(g, { kind: "tower", id: tw.id }); T.add(g);
      this.labelAnchors.push({ key: `tower:${tw.id}`, pos: new THREE.Vector3(x, col === 0 ? legH + tankH + 3.2 : legH * 0.42, z + (col === 0 ? 0 : 4)), title: tw.name, sub: tw.note, tone: tw.tone });
      // feeder pipe to the trunk line
      this.pipe([[x, 1.1, z + r + 0.6], [x, 1.1, z + r + 4], [-38, 1.1, z + r + 4], [-38, 1.1, -6]], 0.55, false);
    });
    // trunk pipe towers -> depot, carrying beads
    const trunk = this.pipe([[-38, 1.1, -6], [-28, 1.1, -6], [-18, 1.1, -6]], 0.75, true);
    const inflow = Math.max(0, Math.min(14, Math.round(town.towers.reduce((s, t) => s + t.leads, 0) / 8)));
    for (let i = 0; i < inflow; i++) this.addBead(trunk, i / Math.max(1, inflow), 0.06 + Math.random() * 0.02);
    // valve
    this.townGroup.add(this.cyl(1.5, 0.6, COL.red, -38, 1.5, -6));

    // ===== Depot (advisors)
    const nb = Math.max(1, town.bays.length);
    const depotW = 6 + nb * 10;
    const dx0 = -18 + depotW / 2 + 2;
    const depot = new THREE.Group(); depot.position.set(dx0, 0, -12);
    depot.add(this.box(depotW, 7.5, 16, COL.wall, 0, 0, 0));
    depot.add(this.box(depotW + 1, 1, 17, COL.roofOrange, 0, 7.5, 0));
    depot.add(this.box(depotW * 0.6, 2.2, 0.5, COL.roofOrange, 0, 8.5, 8.2));
    for (let i = 0; i < nb; i++) {
      const bx = -depotW / 2 + 6 + i * 10 + 2;
      depot.add(this.box(6, 5.2, 0.4, 0x2a3442, bx, 0, 8.05)); // bay door
      const winMat = mat(COL.window, { emissive: COL.window, emissiveIntensity: town.depotOpen ? 0.6 : 0 });
      const win = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 0.3), winMat); win.position.set(bx, 6.2, 8.1); depot.add(win); this.windowMats.push(winMat);
    }
    this.tag(depot, { kind: "depot", id: "depot" }); T.add(depot);
    this.labelAnchors.push({ key: "depot", pos: new THREE.Vector3(dx0, 11, -20), title: "Plumbing depot", sub: `${town.yardLeads.toLocaleString()} leads in the yard`, tone: "grey" });
    flatRect(this.townGroup, depotW + 12, 30, COL.path, dx0, 6, 0.015);

    town.bays.forEach((b, i) => {
      const bx = dx0 - depotW / 2 + 8 + i * 10;
      const bz = -1;
      const vanCol = b.tone === "red" ? COL.red : b.tone === "green" ? COL.green : b.tone === "amber" ? COL.amber : COL.grey;
      const van = this.van(vanCol, b.inSession);
      van.position.set(bx, 0, bz + 1.5); van.rotation.y = Math.PI;
      this.tag(van, { kind: "bay", id: b.repId }); T.add(van);
      this.vans.set(b.repId, { group: van, home: van.position.clone(), rot: van.rotation.y });
      T.add(this.disc(3.4, TONE_COL[b.tone], bx, bz + 1.5, 0.05));
      // crates: this advisor's share of the yard
      const crates = Math.min(12, Math.round(town.yardLeads / Math.max(1, nb) / 40));
      for (let k = 0; k < crates; k++) { const row = Math.floor(k / 3), colk = k % 3; T.add(this.box(1.3, 1.3, 1.3, COL.crate, bx - 1.6 + colk * 1.6, 0, bz + 8 + row * 1.7)); }
      // fuel post = hours today against 8
      T.add(this.box(0.5, 4, 0.5, COL.legs, bx + 4.2, 0, bz + 1));
      T.add(this.box(0.8, Math.max(0.05, 4 * Math.min(1, b.hoursToday / 8)), 0.8, b.hoursToday > 0 ? COL.green : COL.grey, bx + 4.2, 0, bz + 1));
      this.labelAnchors.push({ key: `bay:${b.repId}`, pos: new THREE.Vector3(bx, 5.4, bz + 1.5), title: b.name, sub: b.note, tone: b.tone });
    });

    // ===== Pipe depot -> clinics, with clogs on it
    const outStart: [number, number, number] = [dx0 + depotW / 2, 1.1, -12];
    const clinicX = outStart[0] + 34;
    const mainOut = this.pipe([outStart, [outStart[0] + 10, 1.1, -12], [clinicX - 6, 1.1, -12], [clinicX, 1.1, -12]], 0.75, true);
    town.clogs.forEach((c, i) => {
      const p = mainOut.getPoint(0.3 + i * 0.25);
      const lump = new THREE.Mesh(new THREE.SphereGeometry(1.9, 18, 14), mat(COL.clog)); lump.scale.set(1.5, 1, 1); lump.position.copy(p); lump.position.y = 1.2; lump.castShadow = true;
      this.tag(lump, { kind: "clog", id: c.id }); T.add(lump); this.clogMeshes.push(lump);
      this.labelAnchors.push({ key: `clog:${c.id}`, pos: new THREE.Vector3(p.x, 4.2, p.z), title: `Clog · ${c.count}`, sub: c.label, tone: c.tone });
    });
    for (let i = 0; i < Math.min(6, town.todayBooked + 1); i++) this.addBead(mainOut, i / 6, 0.05);

    // ===== Clinics (houses with tanks), stacked down the right
    const roofs = [COL.roofBlue, COL.roofTeal, COL.roofRed, COL.roofOrange];
    town.tanks.forEach((t, i) => {
      const hx = clinicX + 6 + (i % 2) * 20, hz = -12 + Math.floor(i / 2) * 22 + (i % 2) * 4;
      const g = new THREE.Group(); g.position.set(hx, 0, hz);
      g.add(this.box(9, 5.5, 8, COL.wall, 0, 0, 0));
      const roof = new THREE.Mesh(new THREE.ConeGeometry(7.4, 3.4, 4), mat(roofs[i % roofs.length])); roof.rotation.y = Math.PI / 4; roof.position.set(0, 7.2, 0); roof.castShadow = true; g.add(roof);
      g.add(this.box(1.6, 2.8, 0.3, 0x2a3442, 0, 0, 4.05));
      for (const wx of [-2.8, 2.8]) { const wm = mat(COL.window, { emissive: COL.window, emissiveIntensity: 0 }); const w = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.3, 0.3), wm); w.position.set(wx, 2.6, 4.05); g.add(w); this.windowMats.push(wm); }
      // rainwater tank
      const tankH = 5.5;
      const water = this.cyl(1.95, 0.01, COL.water, 7.2, 0, 1); g.add(water);
      this.fills.push({ water, target: Math.max(0.03, t.fill), maxH: tankH - 0.2, base: 0 });
      g.add(this.cyl(2.1, tankH, COL.glass, 7.2, 0, 1, { transparent: true, opacity: 0.35 }));
      g.add(this.cyl(2.3, 0.5, COL.legs, 7.2, tankH, 1));
      g.add(this.disc(1.5, TONE_COL[t.tone], 7.2, 4.6, 0.06));
      this.pipe([[hx - 6, 1.1, hz], [hx - 4.6, 1.1, hz]], 0.45, false);
      this.tag(g, { kind: "tank", id: t.clinicId }); T.add(g);
      this.tankPos.set(t.clinicId, new THREE.Vector3(hx, 0, hz + 9));
      this.labelAnchors.push({ key: `tank:${t.clinicId}`, pos: new THREE.Vector3(hx, 9.6, hz), title: t.name, sub: t.note, tone: t.tone });
      if (i > 0) this.pipe([[clinicX, 1.1, -12], [clinicX, 1.1, hz], [hx - 6, 1.1, hz]], 0.55, false);
    });

    // ===== Roads: yard road from depot to clinics
    const lastZ = -12 + Math.floor(Math.max(0, town.tanks.length - 1) / 2) * 22 + 10;
    road(this.scenery, dx0, 12, clinicX + 30, 12, 6);
    if (lastZ > 14) road(this.scenery, clinicX + 30, 12, clinicX + 30, lastZ, 6);

    // ===== Meter house + puddles (money)
    const mx = dx0 - depotW / 2 - 6, mz = 34;
    const meter = new THREE.Group(); meter.position.set(mx, 0, mz);
    meter.add(this.box(14, 4.5, 8, COL.wall, 0, 0, 0)); meter.add(this.box(14.6, 0.8, 8.6, COL.roofBlue, 0, 4.5, 0));
    meter.add(this.cyl(1.4, 0.5, COL.legs, 0, 5.3, 0)); meter.add(this.cyl(0.5, 2.2, COL.legs, 0, 5.3, 0));
    this.tag(meter, { kind: "meter", id: "meter" }); T.add(meter);
    this.labelAnchors.push({ key: "meter", pos: new THREE.Vector3(mx, 8.5, mz), title: "Meter house", sub: `$${Math.round(town.totalCost).toLocaleString()} out · $${Math.round(town.totalRevenue).toLocaleString()} in`, tone: town.profit >= 0 ? "green" : "grey" });
    town.puddles.forEach((p, i) => {
      const px = mx + 14 + i * 16, pz = mz + 2;
      const loss = Math.max(0, -p.profit);
      const rad = p.tone === "red" ? 2.2 + Math.min(4, loss / 600) : 1.2;
      const m = this.disc(rad, p.tone === "green" ? COL.green : COL.puddle, px, pz, 0.04, { transparent: true, opacity: p.tone === "grey" ? 0.25 : 0.75 });
      this.tag(m, { kind: "puddle", id: p.city }); T.add(m); this.puddles.push({ mesh: m, phase: i, scale: rad });
      if (p.tone === "red") { const drip = this.cyl(0.35, 1.6, COL.pipe, px, 0, pz - rad - 0.8); T.add(drip); }
      this.labelAnchors.push({ key: `puddle:${p.city}`, pos: new THREE.Vector3(px, 1.2, pz + rad + 1.5), title: `${p.city} ${p.profit >= 0 ? "+" : "−"}$${Math.round(Math.abs(p.profit)).toLocaleString()}`, sub: p.note, tone: p.tone });
    });

    // ===== Trees for life
    const spots: [number, number][] = [[-76, 20], [-50, 30], [-30, -32], [-8, -30], [20, -30], [dx0 + depotW / 2 + 4, 28], [clinicX + 40, -30], [clinicX + 44, 20], [mx - 12, 44], [mx + 60, 44], [-74, -40], [clinicX - 6, 30]];
    for (const [x, z] of spots) this.tree(x, z);
    this.fitCamera();
  }

  /** Point the camera at the middle of the town and zoom so all of it fits. */
  private baseFs = 50;
  private center = new THREE.Vector3(-12, 0, -12);
  private fitCamera() {
    const bounds = new THREE.Box3().setFromObject(this.townGroup);
    if (bounds.isEmpty()) return;
    this.center = bounds.getCenter(new THREE.Vector3()); this.center.y = 0; this.center.add(new THREE.Vector3(-13, 0, -13));
    this.camera.position.copy(this.center).add(new THREE.Vector3(52, 60, 52));
    this.camera.lookAt(this.center);
    this.camera.updateMatrixWorld();
    const inv = this.camera.matrixWorldInverse;
    const w = this.container.clientWidth || 1440, h = this.container.clientHeight || 900;
    const aspect = w / h;
    let need = 1;
    const corners = [bounds.min, bounds.max];
    for (const cx of [0, 1]) for (const cy of [0, 1]) for (const cz of [0, 1]) {
      const v = new THREE.Vector3(corners[cx].x, corners[cy].y, corners[cz].z).applyMatrix4(inv);
      need = Math.max(need, Math.abs(v.x) / aspect, Math.abs(v.y));
    }
    this.baseFs = need * 1.06;
    this.resize();
  }

  /** A booking landed: drive that advisor's van out to the clinic (or the nearest one) and back. */
  celebrateBooking(repId: string, clinicId?: string) {
    const v = this.vans.get(repId) ?? [...this.vans.values()][0];
    if (!v) return;
    const dest = (clinicId && this.tankPos.get(clinicId)) ?? [...this.tankPos.values()][0];
    if (!dest) return;
    const home = v.home.clone();
    const pts = [home, new THREE.Vector3(home.x, 0, 12), new THREE.Vector3(dest.x + 22, 0, 12), new THREE.Vector3(dest.x + 22, 0, dest.z), new THREE.Vector3(dest.x + 6, 0, dest.z)];
    const curve = new THREE.CatmullRomCurve3([...pts, ...pts.slice(0, -1).reverse()], false, "catmullrom", 0.05);
    this.drives = this.drives.filter((d) => d.group !== v.group);
    this.drives.push({ group: v.group, curve, t: 0, home, homeRot: v.rot });
  }

  /** Focus the camera on a thing (soft zoom). */
  focus(target: PickTarget | null) {
    const key = target ? `${target.kind}:${target.id}` : null;
    const a = key ? this.labelAnchors.find((l) => l.key === key || l.key === target?.kind) : null;
    const look = a ? new THREE.Vector3(a.pos.x, 0, a.pos.z) : this.center.clone();
    this.camera.position.copy(look).add(new THREE.Vector3(52, 60, 52));
    this.camera.lookAt(look);
    this.zoomTarget = target ? 0.7 : 1;
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
    this.renderer.domElement.removeEventListener("pointermove", this.onMove);
    this.renderer.domElement.removeEventListener("click", this.onClick);
    this.clearTown();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
  }

  // ---------- internals
  private zoom = 1;
  private zoomTarget = 1;

  private setNight(night: boolean) {
    this.night = night;
    this.scene.background = new THREE.Color(night ? COL.skyNight : COL.sky);
    this.sun.intensity = night ? 0.25 : 1.1;
    this.hemi.intensity = night ? 0.35 : 0.7;
    this.sun.color.set(night ? 0x9fb4ff : 0xffffff);
  }

  private buildGround() {
    flatRect(this.scene, 700, 700, COL.grass, 0, 0, 0);
    // a few darker grass patches for texture
    for (let i = 0; i < 26; i++) { const x = -120 + Math.random() * 260, z = -80 + Math.random() * 160; const p = new THREE.Mesh(new THREE.CircleGeometry(3 + Math.random() * 6, 18), mat(COL.grassDark)); p.rotation.x = -Math.PI / 2; p.position.set(x, 0.01, z); p.receiveShadow = true; this.scene.add(p); }
  }

  private clearTown() {
    for (const s of this.smoke) this.scene.remove(s.mesh);
    for (const b of this.beads) this.scene.remove(b.mesh);
    this.townGroup.clear();
    this.scenery.clear();
    this.pickables = []; this.beads = []; this.drives = []; this.smoke = []; this.puddles = []; this.fills = []; this.clogMeshes = []; this.labelAnchors = []; this.vans.clear(); this.tankPos.clear(); this.windowMats = [];
  }

  private tag(o: THREE.Object3D, t: PickTarget) { o.userData = t; this.pickables.push(o); }
  private box(w: number, h: number, d: number, c: number, x: number, y: number, z: number, extra: Partial<THREE.MeshToonMaterialParameters> = {}) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, extra)); m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true; return m; }
  private cyl(r: number, h: number, c: number, x: number, y: number, z: number, extra: Partial<THREE.MeshToonMaterialParameters> = {}) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 28), mat(c, extra)); m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true; return m; }
  private torus(r: number, t: number, c: number, x: number, y: number, z: number) { const m = new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, 36), mat(c)); m.rotation.x = Math.PI / 2; m.position.set(x, y, z); return m; }
  private disc(r: number, c: number, x: number, z: number, y = 0.03, extra: Partial<THREE.MeshToonMaterialParameters> = {}) { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 40), mat(c, extra)); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); return m; }
  private pipe(points: [number, number, number][], r: number, addToScene: boolean) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, "catmullrom", 0);
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(8, points.length * 24), r, 14, false), mat(COL.pipe)); m.castShadow = true; m.receiveShadow = true;
    (addToScene ? this.townGroup : this.townGroup).add(m);
    // joints
    for (const p of points.slice(1, -1)) this.townGroup.add(this.cyl(r + 0.25, r * 2.2, COL.pipeDark, p[0], p[1] - r * 1.1, p[2]));
    return curve;
  }
  private addBead(curve: THREE.Curve<THREE.Vector3>, t: number, speed: number) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), mat(COL.waterDeep)); this.scene.add(m); this.beads.push({ mesh: m, curve, t, speed });
  }
  private van(color: number, lightsOn: boolean) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.6, 6.2), mat(color)); body.position.y = 1.9; body.castShadow = true; g.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.9, 2.2), mat(color)); cab.position.set(0, 1.55, 3.9); cab.castShadow = true; g.add(cab);
    const wind = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.9, 0.3), mat(0x9fd8ff)); wind.position.set(0, 1.9, 5.0); g.add(wind);
    const lad = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 6.6), mat(COL.grey)); lad.position.y = 3.35; g.add(lad);
    for (let i = 0; i < 6; i++) { const rung = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.2), mat(COL.legs)); rung.position.set(0, 3.5, -2.8 + i * 1.1); g.add(rung); }
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.2), mat(COL.window, { emissive: COL.window, emissiveIntensity: lightsOn ? 1 : 0 })); light.position.set(1.1, 1.2, 5.05); g.add(light);
    const light2 = light.clone(); light2.position.x = -1.1; g.add(light2);
    for (const [wx, wz] of [[-1.6, 2.2], [1.6, 2.2], [-1.6, -2.0], [1.6, -2.0]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.5, 16), mat(0x2a3442)); w.rotation.z = Math.PI / 2; w.position.set(wx, 0.65, wz); g.add(w); }
    return g;
  }
  private tree(x: number, z: number) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    g.add(this.cyl(0.4, 1.6, COL.trunk, 0, 0, 0));
    const c1 = new THREE.Mesh(new THREE.SphereGeometry(2.4, 14, 12), mat(COL.tree)); c1.position.y = 3.4; c1.castShadow = true; g.add(c1);
    const c2 = new THREE.Mesh(new THREE.SphereGeometry(1.7, 14, 12), mat(COL.treeDark)); c2.position.set(1.2, 4.6, 0.6); c2.castShadow = true; g.add(c2);
    this.scenery.add(g);
  }

  private resize = () => {
    const w = this.container.clientWidth || 1, h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    const fs = this.baseFs * this.zoom;
    const aspect = w / h;
    this.camera.left = -fs * aspect; this.camera.right = fs * aspect; this.camera.top = fs; this.camera.bottom = -fs;
    this.camera.updateProjectionMatrix();
  };

  private onMove = (e: PointerEvent) => {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  };
  private onClick = () => {
    const hit = this.pickAt();
    this.opts.onPick?.(hit ? (hit.userData as PickTarget) : null);
  };
  private pickAt(): THREE.Object3D | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.pickables, true);
    if (!hits.length) return null;
    let o: THREE.Object3D | null = hits[0].object;
    while (o && !(o.userData && (o.userData as PickTarget).kind)) o = o.parent;
    return o;
  }

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = this.clock.elapsedTime;

    if (Math.abs(this.zoom - this.zoomTarget) > 0.002) { this.zoom += (this.zoomTarget - this.zoom) * 0.08; this.resize(); }

    for (const b of this.beads) { b.t = (b.t + b.speed * dt) % 1; const p = b.curve.getPoint(b.t); b.mesh.position.set(p.x, p.y + 0.9, p.z); }
    for (const f of this.fills) {
      const cur = f.water.scale.y * 0.01; const next = cur + (f.target * f.maxH - cur) * Math.min(1, dt * 2.2);
      f.water.scale.y = Math.max(0.01, next) / 0.01; f.water.position.y = f.base + next / 2;
    }
    for (const s of this.smoke) { const k = (t * 0.5 + s.phase) % 3; s.mesh.position.set(s.base.x + Math.sin(t + s.phase) * 0.6, s.base.y + k * 1.4, s.base.z); (s.mesh.material as THREE.Material).opacity = 0.6 * (1 - k / 3); }
    for (const p of this.puddles) { const k = 1 + Math.sin(t * 1.6 + p.phase) * 0.04; p.mesh.scale.set(k, k, 1); }
    for (const c of this.clogMeshes) { const k = 1 + Math.sin(t * 3) * 0.06; c.scale.set(1.5 * k, k, k); }
    for (const d of [...this.drives]) {
      d.t += dt * 0.12;
      if (d.t >= 1) { d.group.position.copy(d.home); d.group.rotation.y = d.homeRot; this.drives = this.drives.filter((x) => x !== d); continue; }
      const p = d.curve.getPoint(d.t); const ahead = d.curve.getPoint(Math.min(1, d.t + 0.01));
      d.group.position.set(p.x, 0, p.z); d.group.rotation.y = Math.atan2(ahead.x - p.x, ahead.z - p.z);
    }
    // hover
    const hit = this.pickAt();
    if (hit !== this.hovered) { if (this.hovered) this.hovered.scale.setScalar(1); this.hovered = hit; if (hit) hit.scale.setScalar(1.06); this.renderer.domElement.style.cursor = hit ? "pointer" : "default"; }
    this.renderer.render(this.scene, this.camera);

    // labels
    if (this.opts.onLabels) {
      const w = this.container.clientWidth, h = this.container.clientHeight;
      const out: LabelSpec[] = this.labelAnchors.map((a) => { const v = a.pos.clone().project(this.camera); return { key: a.key, x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h, title: a.title, sub: a.sub, tone: a.tone, hidden: v.z > 1 }; });
      this.opts.onLabels(out);
    }
  }
}

function flatRect(parent: THREE.Object3D, w: number, d: number, c: number, x: number, z: number, y: number) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(c)); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; parent.add(m); return m;
}
function road(parent: THREE.Object3D, x1: number, z1: number, x2: number, z2: number, w: number) {
  const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz); if (len < 1) return;
  const m = flatRect(parent, len, w, COL.road, (x1 + x2) / 2, (z1 + z2) / 2, 0.02); m.rotation.z = -Math.atan2(dz, dx);
  const n = Math.floor(len / 5);
  for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; const l = flatRect(parent, 1.8, 0.3, COL.roadLine, x1 + dx * t, z1 + dz * t, 0.03); l.rotation.z = -Math.atan2(dz, dx); }
}
