import * as THREE from "three";
import type { Town, Tone } from "./model";

/**
 * The plumbing town, drawn with three.js. Takes a Town (see model.ts) and
 * keeps the picture in step with it.
 *
 * What moves: water beads run down the pipes; tank levels ease to their new
 * height; anything on fire burns with flames and smoke; anything doing well
 * gets an orbiting gold star; an advisor who's online has their van at the
 * dig site, digging; when a booking lands the van drives to the clinic,
 * drops a crate into its tank, and comes back to the hole.
 *
 * Everything clickable carries userData = { kind, id } so the page can open
 * that thing's numbers.
 */

export type PickKind = "tower" | "bay" | "tank" | "puddle" | "depot" | "meter" | "pump";
export type PickTarget = { kind: PickKind; id: string };

export type LabelSpec = { key: string; x: number; y: number; short: string; title: string; sub: string; tone: Tone; hidden: boolean; active: boolean };

type Opts = {
  onPick?: (t: PickTarget | null) => void;
  onLabels?: (labels: LabelSpec[]) => void;
};

const COL = {
  grass: 0x9ad57f, grassDark: 0x7fc26a, path: 0xf3dfb0, road: 0xb9bfc7, roadLine: 0xfff7d6,
  sky: 0xc8ecff, skyNight: 0x131a33,
  wall: 0xfff6e8, roofRed: 0xe8543f, roofBlue: 0x3d84f5, roofOrange: 0xf5a623, roofTeal: 0x2bb5a0,
  legs: 0x5c6b7a, glass: 0xdff3ff, water: 0x2f9bff, waterDeep: 0x1f7be0,
  pipe: 0xaab4c0, pipeDark: 0x8593a1, crate: 0x3d84f5, dirt: 0x8a5a33, hole: 0x3b2a1c,
  red: 0xef4b3d, amber: 0xf5a623, green: 0x2fc46e, grey: 0xb8c0c9, gold: 0xffc83d,
  tree: 0x4fb35c, treeDark: 0x3a9a4b, trunk: 0x8d6a4a, puddle: 0x63b3ff, window: 0xffd27a,
  flame1: 0xff3b1f, flame2: 0xff8a00, flame3: 0xffd23a, smoke: 0x3a3f46,
};
const TONE_COL: Record<Tone, number> = { red: COL.red, amber: COL.amber, green: COL.green, grey: COL.grey };
const CAM_OFFSET = new THREE.Vector3(52, 60, 52);

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

/** A flat sign with text painted on it. */
function textPlane(text: string, o: { w: number; h: number; font?: number; color?: string; bg?: string; bold?: boolean; radius?: number }) {
  const scale = 24;
  const c = document.createElement("canvas"); c.width = Math.round(o.w * scale); c.height = Math.round(o.h * scale);
  const g = c.getContext("2d")!;
  if (o.bg) { g.fillStyle = o.bg; roundRect(g, 0, 0, c.width, c.height, (o.radius ?? 0.6) * scale); g.fill(); }
  g.fillStyle = o.color ?? "#1b2430"; g.textAlign = "center"; g.textBaseline = "middle";
  const px = (o.font ?? o.h * 0.55) * scale;
  g.font = `${o.bold === false ? "600" : "800"} ${px}px -apple-system, Inter, Helvetica, Arial, sans-serif`;
  const lines = text.split("\n");
  lines.forEach((ln, i) => g.fillText(ln, c.width / 2, c.height / 2 + (i - (lines.length - 1) / 2) * px * 1.15));
  const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
  return new THREE.Mesh(new THREE.PlaneGeometry(o.w, o.h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
}
function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function shortName(name: string): string {
  const words = name.replace(/hair transplant/i, "").trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).join(" ") || name;
}
/** One-word district signpost, facing the camera. */
function signpost(text: string, x: number, z: number, color: string) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.8, 14, 0.8), mat(COL.legs)); post.position.y = 7; post.castShadow = true; g.add(post);
  const title = textPlane(text, { w: 18, h: 5, font: 3.4, color: "#ffffff", bg: color, radius: 0.9 });
  title.position.set(0, 16.5, 0); title.rotation.y = Math.PI / 4; g.add(title);
  return g;
}

type Bead = { mesh: THREE.Mesh; curve: THREE.Curve<THREE.Vector3>; t: number; speed: number };
type Fill = { water: THREE.Mesh; target: number; maxH: number; base: number };
type Fire = { group: THREE.Group; flames: THREE.Mesh[]; smoke: THREE.Mesh[]; size: number };
type Star = { ring: THREE.Mesh; bits: THREE.Mesh[]; y: number };
type Dig = { repId: string; site: THREE.Vector3; shovel: THREE.Object3D; clods: { mesh: THREE.Mesh; v: THREE.Vector3; life: number }[]; active: boolean; nextClod: number };
type Van = { group: THREE.Group; bay: THREE.Vector3; site: THREE.Vector3; rot: number; busy: boolean };
type Trip = {
  van: Van; curve: THREE.CatmullRomCurve3; t: number; speed: number;
  phase: "out" | "drop" | "back"; clinicId: string; crate: THREE.Mesh | null; dropT: number; puffs: number;
};
type Puff = { mesh: THREE.Mesh; life: number };

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
  private fx = new THREE.Group();
  private pickables: THREE.Object3D[] = [];
  private beads: Bead[] = [];
  private fills: Fill[] = [];
  private tankFills = new Map<string, Fill>();
  private tankTags = new Map<string, THREE.Group>();
  private fires: Fire[] = [];
  private stars: Star[] = [];
  private digs: Dig[] = [];
  private vans = new Map<string, Van>();
  private trips: Trip[] = [];
  private puffs: Puff[] = [];
  private tankPos = new Map<string, THREE.Vector3>();
  private roadZ = 24;
  private clinicRoadX = 0;
  private labelAnchors: { key: string; pos: THREE.Vector3; short: string; title: string; sub: string; tone: Tone }[] = [];
  private hovered: THREE.Object3D | null = null;
  private windowMats: THREE.MeshToonMaterial[] = [];
  private sun: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(-2, -2);
  private disposed = false;
  private zoom = 1;
  private zoomTarget = 1;
  private baseFs = 50;
  private center = new THREE.Vector3(0, 0, 0);

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
    this.camera.position.copy(CAM_OFFSET);
    this.camera.lookAt(0, 0, 0);

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x8fbf7a, 0.7);
    this.scene.add(this.hemi);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.2));
    this.sun = new THREE.DirectionalLight(0xffffff, 1.1);
    this.sun.position.set(50, 80, 10);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -120, right: 120, top: 120, bottom: -120, near: 1, far: 300 });
    this.sun.shadow.bias = -0.0006;
    this.scene.add(this.sun);
    this.scene.background = new THREE.Color(COL.sky);
    this.scene.add(this.townGroup, this.scenery, this.fx);
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
    const T = this.townGroup;

    // ----- Water towers (ads)
    town.towers.forEach((tw, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = -70 + col * 24, z = -34 + row * 20;
      const legH = 8 + tw.fill * 8;
      const g = new THREE.Group(); g.position.set(x, 0, z);
      for (const [dx, dz] of [[-2.3, -2.3], [2.3, -2.3], [-2.3, 2.3], [2.3, 2.3]]) g.add(this.box(0.7, legH, 0.7, COL.legs, dx, 0, dz));
      g.add(this.box(1.2, 0.5, 5.4, COL.legs, 0, legH * 0.5, 0)); g.add(this.box(5.4, 0.5, 1.2, COL.legs, 0, legH * 0.5, 0));
      g.add(this.box(7, 0.6, 7, COL.legs, 0, legH, 0));
      const tankH = 6, r = 3.4;
      const water = this.cyl(r - 0.25, 0.01, tw.leads > 0 ? COL.water : COL.grey, 0, legH + 0.6, 0); g.add(water);
      this.fills.push({ water, target: Math.max(0.05, tw.fill), maxH: tankH - 0.3, base: legH + 0.6 });
      g.add(this.cyl(r, tankH, COL.glass, 0, legH + 0.6, 0, { transparent: true, opacity: 0.35 }));
      g.add(this.torus(r + 0.1, 0.18, COL.legs, 0, legH + 1.2, 0)); g.add(this.torus(r + 0.1, 0.18, COL.legs, 0, legH + 5.6, 0));
      const roof = new THREE.Mesh(new THREE.ConeGeometry(r + 0.7, 2.4, 28), mat(COL.roofRed)); roof.position.set(0, legH + 0.6 + tankH + 1.2, 0); roof.castShadow = true; g.add(roof);
      g.add(this.cyl(0.45, legH + 1, COL.pipe, 0, 0, r + 0.6));
      const adTag = textPlane("AD", { w: 4.6, h: 2.6, font: 1.9, color: "#ffffff", bg: "#1b2430" }); adTag.position.set(r * 0.72, legH + 3.8, r * 0.72); adTag.rotation.y = Math.PI / 4; g.add(adTag);
      g.add(this.disc(1.6, TONE_COL[tw.tone], 0, r + 0.6, 0.06));
      this.tag(g, { kind: "tower", id: tw.id }); T.add(g);
      if (tw.fire) this.addFire(new THREE.Vector3(x, legH + 0.6 + tankH + 2.4, z), 2.1);
      if (tw.star) this.addStar(new THREE.Vector3(x, legH + 0.6 + tankH + 4.5, z));
      this.labelAnchors.push({ key: `tower:${tw.id}`, pos: new THREE.Vector3(x, legH + tankH + (tw.fire ? 8 : 3.4), z), short: shortName(tw.name), title: `AD · ${tw.name}`, sub: tw.note, tone: tw.tone });
      this.pipe([[x, 1.1, z + r + 0.6], [x, 1.1, z + r + 4], [-38, 1.1, z + r + 4], [-38, 1.1, -6]], 0.55);
    });
    const trunk = this.pipe([[-38, 1.1, -6], [-28, 1.1, -6], [-18, 1.1, -6]], 0.75);
    const inflow = Math.max(2, Math.min(14, Math.round(town.towers.reduce((s, t) => s + t.leads, 0) / 8)));
    for (let i = 0; i < inflow; i++) this.addBead(trunk, i / inflow, 0.06 + Math.random() * 0.02);

    // ----- Pump house (the Make.com automations) sits on the trunk line
    const pump = new THREE.Group(); pump.position.set(-38, 0, -16);
    pump.add(this.box(7, 4.5, 6, COL.wall, 0, 0, 0)); pump.add(this.box(7.6, 0.7, 6.6, COL.roofTeal, 0, 4.5, 0));
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.3, 8, 36), mat(COL.red)); wheel.position.set(0, 3, 3.3); pump.add(wheel);
    pump.add(this.box(0.3, 2.6, 0.3, COL.red, 0, 1.7, 3.3)); pump.add(this.box(2.6, 0.3, 0.3, COL.red, 0, 2.85, 3.3));
    this.pipe([[-38, 1.1, -13], [-38, 1.1, -6]], 0.55);
    this.tag(pump, { kind: "pump", id: "pump" }); T.add(pump);
    if (town.pump.fire) this.addFire(new THREE.Vector3(-38, 5.4, -16), 1.8);
    this.labelAnchors.push({ key: "pump:pump", pos: new THREE.Vector3(-38, town.pump.fire ? 12 : 7, -16), short: "Make", title: "MAKE · automations", sub: town.pump.note, tone: town.pump.fire ? "red" : "grey" });

    // ----- Depot
    const nb = Math.max(1, town.bays.length);
    const depotW = 6 + nb * 10;
    const dx0 = -18 + depotW / 2 + 2;
    const depot = new THREE.Group(); depot.position.set(dx0, 0, -12);
    depot.add(this.box(depotW, 7.5, 16, COL.wall, 0, 0, 0));
    depot.add(this.box(depotW + 1, 1, 17, COL.roofOrange, 0, 7.5, 0));
    depot.add(this.box(depotW * 0.6, 2.2, 0.5, COL.roofOrange, 0, 8.5, 8.2));
    const depotSign = textPlane("ADVISORS · DEPOT", { w: depotW * 0.58, h: 2, font: 1.35, color: "#1b2430" }); depotSign.position.set(0, 9.6, 8.5); depot.add(depotSign);
    for (let i = 0; i < nb; i++) {
      const bx = -depotW / 2 + 8 + i * 10;
      depot.add(this.box(6, 5.2, 0.4, 0x2a3442, bx, 0, 8.05));
      const winMat = mat(COL.window, { emissive: COL.window, emissiveIntensity: town.depotOpen ? 0.6 : 0 });
      const win = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 0.3), winMat); win.position.set(bx, 6.2, 8.1); depot.add(win); this.windowMats.push(winMat);
    }
    this.tag(depot, { kind: "depot", id: "depot" }); T.add(depot);
    this.labelAnchors.push({ key: "depot", pos: new THREE.Vector3(dx0, 11, -20), short: "Depot", title: "Plumbing depot", sub: `${town.yardLeads.toLocaleString()} leads in the yard`, tone: "grey" });
    flatRect(this.scenery, depotW + 14, 34, COL.path, dx0, 7, 0.015);

    // ----- Bays, vans and dig sites
    town.bays.forEach((b, i) => {
      const bx = dx0 - depotW / 2 + 8 + i * 10;
      const bayPos = new THREE.Vector3(bx, 0, 0.5);
      const sitePos = new THREE.Vector3(bx, 0, 14);
      const vanCol = b.fire ? COL.red : b.star ? COL.green : b.inSession ? COL.roofBlue : COL.grey;
      const van = this.makeVan(vanCol, b.inSession, b.name);
      T.add(van);
      T.add(this.disc(3.4, TONE_COL[b.tone], bx, 0.5, 0.05));
      // dig site: a hole, a dirt mound and a shovel that works while they're online
      const hole = this.disc(2.4, COL.hole, sitePos.x, sitePos.z + 4.5, 0.04); T.add(hole);
      const mound = new THREE.Mesh(new THREE.SphereGeometry(2, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(COL.dirt)); mound.position.set(sitePos.x + 3.6, 0, sitePos.z + 5.2); mound.castShadow = true; T.add(mound);
      const shovel = new THREE.Group();
      shovel.add(this.box(0.25, 3.2, 0.25, COL.trunk, 0, 0, 0)); shovel.add(this.box(1.1, 1.4, 0.2, COL.legs, 0, -0.9, 0));
      shovel.position.set(sitePos.x - 1.6, 1.6, sitePos.z + 4.2); T.add(shovel);
      if (b.inSession) { van.position.set(sitePos.x, 0, sitePos.z); van.rotation.y = Math.PI / 2; }
      else { van.position.copy(bayPos); van.rotation.y = Math.PI; shovel.visible = false; hole.visible = false; mound.visible = false; }
      this.vans.set(b.repId, { group: van, bay: bayPos, site: sitePos.clone(), rot: van.rotation.y, busy: false });
      this.digs.push({ repId: b.repId, site: sitePos.clone(), shovel, clods: [], active: b.inSession, nextClod: Math.random() });
      T.add(this.box(0.5, 4, 0.5, COL.legs, bx + 4.2, 0, 1)); T.add(this.box(0.8, Math.max(0.05, 4 * Math.min(1, b.hoursToday / 8)), 0.8, b.hoursToday > 0 ? COL.green : COL.grey, bx + 4.2, 0, 1));
      const ax = b.inSession ? sitePos.x : bx, az = b.inSession ? sitePos.z : 0.5;
      if (b.fire) this.addFire(new THREE.Vector3(ax, 4.2, az), 1.6);
      if (b.star) this.addStar(new THREE.Vector3(ax, 6.5, az));
      this.labelAnchors.push({ key: `bay:${b.repId}`, pos: new THREE.Vector3(ax, b.fire ? 10 : 6, az), short: b.name, title: `ADVISOR · ${b.name}`, sub: b.note, tone: b.tone });
    });

    // ----- Pipe out to the clinics
    const outStart: [number, number, number] = [dx0 + depotW / 2, 1.1, -12];
    const clinicX = outStart[0] + 34;
    this.clinicRoadX = clinicX + 32;
    const mainOut = this.pipe([outStart, [outStart[0] + 10, 1.1, -12], [clinicX - 6, 1.1, -12], [clinicX, 1.1, -12]], 0.75);
    for (let i = 0; i < Math.min(6, town.todayBooked + 1); i++) this.addBead(mainOut, i / 6, 0.05);

    // ----- Clinics
    const roofs = [COL.roofBlue, COL.roofTeal, COL.roofRed, COL.roofOrange];
    let lastZ = -12;
    town.tanks.forEach((t, i) => {
      const hx = clinicX + 6 + (i % 2) * 20, hz = -12 + Math.floor(i / 2) * 22 + (i % 2) * 4;
      lastZ = Math.max(lastZ, hz);
      const g = new THREE.Group(); g.position.set(hx, 0, hz);
      g.add(this.box(9, 5.5, 8, COL.wall, 0, 0, 0));
      const roof = new THREE.Mesh(new THREE.ConeGeometry(7.4, 3.4, 4), mat(roofs[i % roofs.length])); roof.rotation.y = Math.PI / 4; roof.position.set(0, 7.2, 0); roof.castShadow = true; g.add(roof);
      g.add(this.box(1.6, 2.8, 0.3, 0x2a3442, 0, 0, 4.05));
      for (const wx of [-2.8, 2.8]) { const wm = mat(COL.window, { emissive: COL.window, emissiveIntensity: 0 }); const w = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.3, 0.3), wm); w.position.set(wx, 2.6, 4.05); g.add(w); this.windowMats.push(wm); }
      const cross = new THREE.Group(); cross.add(this.box(1.6, 0.5, 0.3, COL.red, 0, 0, 0)); cross.add(this.box(0.5, 1.6, 0.3, COL.red, 0, -0.55, 0)); cross.position.set(0, 6.1, 4.2); g.add(cross);
      // rainwater tank, big enough that the level reads from across the room
      const tankH = 7, tr = 2.6;
      const water = this.cyl(tr - 0.15, 0.01, COL.water, 7.6, 0, 1); g.add(water);
      const fill: Fill = { water, target: Math.max(0.02, t.fill), maxH: tankH - 0.2, base: 0 };
      this.fills.push(fill); this.tankFills.set(t.clinicId, fill);
      g.add(this.cyl(tr, tankH, COL.glass, 7.6, 0, 1, { transparent: true, opacity: 0.35 }));
      for (const f of [0.25, 0.5, 0.75]) g.add(this.torus(tr + 0.05, 0.08, COL.legs, 7.6, f * tankH, 1));
      g.add(this.cyl(tr + 0.2, 0.5, COL.legs, 7.6, tankH, 1));
      g.add(this.disc(1.6, TONE_COL[t.tone], 7.6, 5.4, 0.06));
      const holder = new THREE.Group(); holder.position.set(7.6, tankH + 3, 1); holder.rotation.y = Math.PI / 4; g.add(holder);
      this.tankTags.set(t.clinicId, holder);
      this.paintTankTag(t.clinicId, t.delivered, t.packSize);
      this.pipe([[hx - 6, 1.1, hz], [hx - 4.6, 1.1, hz]], 0.45);
      this.tag(g, { kind: "tank", id: t.clinicId }); T.add(g);
      this.tankPos.set(t.clinicId, new THREE.Vector3(hx + 7.6, 0, hz + 1));
      if (t.fire) this.addFire(new THREE.Vector3(hx, 8.6, hz), 1.9);
      this.labelAnchors.push({ key: `tank:${t.clinicId}`, pos: new THREE.Vector3(hx, t.fire ? 14 : 9.8, hz), short: shortName(t.name), title: `CLINIC · ${t.name}`, sub: t.note, tone: t.tone });
      if (i > 0) this.pipe([[clinicX, 1.1, -12], [clinicX, 1.1, hz], [hx - 6, 1.1, hz]], 0.55);
    });

    // ----- Roads: past the dig sites, then up the clinic street
    road(this.scenery, dx0 - depotW / 2 - 10, this.roadZ, this.clinicRoadX, this.roadZ, 6);
    road(this.scenery, this.clinicRoadX, this.roadZ, this.clinicRoadX, -20, 6);
    for (const [, p] of this.tankPos) road(this.scenery, p.x + 6, p.z + 6, this.clinicRoadX, p.z + 6, 4);
    void lastZ;

    // ----- Meter house + puddles
    const mx = dx0 - depotW / 2 - 6, mz = 38;
    const meter = new THREE.Group(); meter.position.set(mx, 0, mz);
    meter.add(this.box(14, 4.5, 8, COL.wall, 0, 0, 0)); meter.add(this.box(14.6, 0.8, 8.6, COL.roofBlue, 0, 4.5, 0));
    meter.add(this.cyl(1.4, 0.5, COL.legs, 0, 5.3, 0)); meter.add(this.cyl(0.5, 2.2, COL.legs, 0, 5.3, 0));
    const moneySign = textPlane("MONEY", { w: 8, h: 2.2, font: 1.5, color: "#ffffff", bg: "#1b2430" }); moneySign.position.set(0, 2.6, 4.2); meter.add(moneySign);
    this.tag(meter, { kind: "meter", id: "meter" }); T.add(meter);
    this.labelAnchors.push({ key: "meter", pos: new THREE.Vector3(mx, 8.5, mz), short: "Money", title: `MONEY · ${town.rangeLabel}`, sub: `$${Math.round(town.totalCost).toLocaleString()} out · $${Math.round(town.totalRevenue).toLocaleString()} in`, tone: town.profit >= 0 ? "green" : "grey" });
    town.puddles.forEach((p, i) => {
      const px = mx + 14 + i * 16, pz = mz + 2;
      const loss = Math.max(0, -p.profit);
      const rad = p.tone === "red" ? 2.2 + Math.min(4, loss / 600) : 1.3;
      const m = this.disc(rad, p.star ? COL.gold : COL.puddle, px, pz, 0.04, { transparent: true, opacity: p.tone === "grey" ? 0.25 : 0.75 });
      this.tag(m, { kind: "puddle", id: p.city }); T.add(m);
      if (p.tone === "red") T.add(this.cyl(0.35, 1.6, COL.pipe, px, 0, pz - rad - 0.8));
      if (p.star) this.addStar(new THREE.Vector3(px, 3.2, pz));
      const cityTag = textPlane(p.city.toUpperCase(), { w: 10, h: 2, font: 1.1, color: "#1b2430" }); cityTag.rotation.x = -Math.PI / 2; cityTag.rotation.z = -Math.PI / 4; cityTag.position.set(px, 0.08, pz + rad + 2.2); T.add(cityTag);
      this.labelAnchors.push({ key: `puddle:${p.city}`, pos: new THREE.Vector3(px, 1.2, pz + rad + 1.5), short: p.city, title: `${p.city.toUpperCase()} · ${p.profit >= 0 ? "made" : "lost"} $${Math.round(Math.abs(p.profit)).toLocaleString()}`, sub: p.note, tone: p.tone });
    });

    // ----- Trees and signposts
    const spots: [number, number][] = [[-84, 22], [-56, 30], [-30, -32], [-8, -30], [20, -30], [dx0 + depotW / 2 + 4, 32], [clinicX + 40, -30], [clinicX + 44, 20], [mx - 12, 46], [mx + 60, 46], [-84, -40], [clinicX - 6, 30]];
    for (const [x, z] of spots) this.tree(x, z);
    this.scenery.add(signpost("ADS", -84, -10, "#1b2430"));
    this.scenery.add(signpost("ADVISORS", dx0 + depotW / 2 + 10, -26, "#d97706"));
    this.scenery.add(signpost("CLINICS", clinicX + 30, -34, "#1d6fd8"));
    this.scenery.add(signpost("MONEY", mx - 16, mz + 4, "#1a7a45"));
    this.fitCamera();
  }

  /** A booking landed: this advisor's van drives to the clinic, drops a crate in the tank and comes back. */
  deliverBooking(repId: string | null, clinicId: string | null) {
    const van = (repId && this.vans.get(repId)) || [...this.vans.values()].find((v) => !v.busy) || null;
    if (!van || van.busy) return;
    const id = clinicId && this.tankPos.has(clinicId) ? clinicId : [...this.tankPos.keys()][0];
    const dest = id ? this.tankPos.get(id) : null;
    if (!dest || !id) return;
    const from = van.group.position.clone();
    const out = [from, new THREE.Vector3(from.x, 0, this.roadZ), new THREE.Vector3(this.clinicRoadX, 0, this.roadZ), new THREE.Vector3(this.clinicRoadX, 0, dest.z + 6), new THREE.Vector3(dest.x + 6, 0, dest.z + 6)];
    van.busy = true;
    this.trips.push({ van, curve: new THREE.CatmullRomCurve3(out, false, "catmullrom", 0.05), t: 0, speed: 0.22, phase: "out", clinicId: id, crate: null, dropT: 0, puffs: 0 });
  }

  /** Tank level changed: ease the water up and repaint the count. */
  setTankFill(clinicId: string, delivered: number, packSize: number) {
    const f = this.tankFills.get(clinicId);
    if (f) f.target = Math.max(0.02, packSize > 0 ? Math.min(1, delivered / packSize) : 0);
    this.paintTankTag(clinicId, delivered, packSize);
  }

  focus(target: PickTarget | null) {
    const key = target ? (target.kind === "depot" || target.kind === "meter" ? target.kind : `${target.kind}:${target.id}`) : null;
    const a = key ? this.labelAnchors.find((l) => l.key === key) : null;
    const look = a ? new THREE.Vector3(a.pos.x, 0, a.pos.z) : this.center.clone();
    this.camera.position.copy(look).add(CAM_OFFSET);
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
    this.renderer.domElement.parentNode?.removeChild(this.renderer.domElement);
  }

  // ======================================================== building blocks
  private setNight(night: boolean) {
    this.scene.background = new THREE.Color(night ? COL.skyNight : COL.sky);
    this.sun.intensity = night ? 0.25 : 1.1;
    this.hemi.intensity = night ? 0.35 : 0.7;
    this.sun.color.set(night ? 0x9fb4ff : 0xffffff);
  }
  private buildGround() {
    flatRect(this.scene, 700, 700, COL.grass, 0, 0, 0);
    for (let i = 0; i < 26; i++) { const x = -120 + Math.random() * 260, z = -80 + Math.random() * 160; const p = new THREE.Mesh(new THREE.CircleGeometry(3 + Math.random() * 6, 18), mat(COL.grassDark)); p.rotation.x = -Math.PI / 2; p.position.set(x, 0.01, z); p.receiveShadow = true; this.scene.add(p); }
  }
  private clearTown() {
    for (const b of this.beads) this.scene.remove(b.mesh);
    this.townGroup.clear(); this.scenery.clear(); this.fx.clear();
    this.pickables = []; this.beads = []; this.fills = []; this.tankFills.clear(); this.tankTags.clear(); this.fires = []; this.stars = []; this.digs = []; this.vans.clear(); this.trips = []; this.puffs = []; this.tankPos.clear(); this.labelAnchors = []; this.windowMats = []; this.hovered = null;
  }
  private tag(o: THREE.Object3D, t: PickTarget) { o.userData = t; this.pickables.push(o); }
  private box(w: number, h: number, d: number, c: number, x: number, y: number, z: number, extra: Partial<THREE.MeshToonMaterialParameters> = {}) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, extra)); m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true; return m; }
  private cyl(r: number, h: number, c: number, x: number, y: number, z: number, extra: Partial<THREE.MeshToonMaterialParameters> = {}) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 28), mat(c, extra)); m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true; return m; }
  private torus(r: number, t: number, c: number, x: number, y: number, z: number) { const m = new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, 36), mat(c)); m.rotation.x = Math.PI / 2; m.position.set(x, y, z); return m; }
  private disc(r: number, c: number, x: number, z: number, y = 0.03, extra: Partial<THREE.MeshToonMaterialParameters> = {}) { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 40), mat(c, extra)); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); return m; }
  private pipe(points: [number, number, number][], r: number) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, "catmullrom", 0);
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(8, points.length * 24), r, 14, false), mat(COL.pipe)); m.castShadow = true; m.receiveShadow = true;
    this.townGroup.add(m);
    for (const p of points.slice(1, -1)) this.townGroup.add(this.cyl(r + 0.25, r * 2.2, COL.pipeDark, p[0], p[1] - r * 1.1, p[2]));
    return curve;
  }
  private addBead(curve: THREE.Curve<THREE.Vector3>, t: number, speed: number) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), mat(COL.waterDeep)); this.scene.add(m); this.beads.push({ mesh: m, curve, t, speed });
  }
  private makeVan(color: number, lightsOn: boolean, name: string) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.6, 6.2), mat(color)); body.position.y = 1.9; body.castShadow = true; g.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.9, 2.2), mat(color)); cab.position.set(0, 1.55, 3.9); cab.castShadow = true; g.add(cab);
    const wind = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.9, 0.3), mat(0x9fd8ff)); wind.position.set(0, 1.9, 5.0); g.add(wind);
    const lad = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 6.6), mat(COL.grey)); lad.position.y = 3.35; g.add(lad);
    for (let i = 0; i < 6; i++) { const rung = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.2), mat(COL.legs)); rung.position.set(0, 3.5, -2.8 + i * 1.1); g.add(rung); }
    for (const side of [1, -1]) { const t = textPlane(name.toUpperCase(), { w: 4.6, h: 1.3, font: 0.85, color: "#ffffff", bg: "rgba(0,0,0,0.35)" }); t.position.set(side * 1.62, 2.1, -0.4); t.rotation.y = side * Math.PI / 2; g.add(t); }
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
  private paintTankTag(clinicId: string, delivered: number, packSize: number) {
    const holder = this.tankTags.get(clinicId); if (!holder) return;
    holder.clear();
    const pct = packSize > 0 ? Math.round(Math.min(1, delivered / packSize) * 100) : 0;
    holder.add(textPlane(`${delivered} / ${packSize}\n${pct}% full`, { w: 8.2, h: 4.4, font: 1.6, color: "#ffffff", bg: "#1b2430" }));
  }
  /** Flames and smoke on something that's bleeding or broken. */
  private addFire(pos: THREE.Vector3, size: number) {
    const group = new THREE.Group(); group.position.copy(pos);
    const flames: THREE.Mesh[] = [];
    const cols = [COL.flame1, COL.flame2, COL.flame3];
    for (let i = 0; i < 7; i++) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.55 * size, 2 * size, 8), new THREE.MeshBasicMaterial({ color: cols[i % 3], transparent: true, opacity: 0.92 }));
      f.position.set((Math.random() - 0.5) * 2.2 * size, size, (Math.random() - 0.5) * 2.2 * size);
      group.add(f); flames.push(f);
    }
    const smoke: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.7 * size + i * 0.3, 10, 8), new THREE.MeshBasicMaterial({ color: COL.smoke, transparent: true, opacity: 0.5 }));
      s.position.set(0, 2.5 * size + i * 1.6, 0); group.add(s); smoke.push(s);
    }
    this.fx.add(group); this.fires.push({ group, flames, smoke, size });
  }
  /** Gold ring and orbiting stars on something going well. */
  private addStar(pos: THREE.Vector3) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3, 0.28, 8, 40), new THREE.MeshBasicMaterial({ color: COL.gold })); ring.position.copy(pos); ring.rotation.x = Math.PI / 2; this.fx.add(ring);
    const bits: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.OctahedronGeometry(0.8), new THREE.MeshBasicMaterial({ color: COL.gold })); this.fx.add(b); bits.push(b); }
    this.stars.push({ ring, bits, y: pos.y });
  }
  private puff(at: THREE.Vector3) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshBasicMaterial({ color: 0xcfd6dd, transparent: true, opacity: 0.7 })); m.position.copy(at); m.position.y = 1.2; this.fx.add(m); this.puffs.push({ mesh: m, life: 1 });
  }

  // ======================================================== camera + input
  private fitCamera() {
    const bounds = new THREE.Box3().setFromObject(this.townGroup);
    if (bounds.isEmpty()) return;
    this.center = bounds.getCenter(new THREE.Vector3()); this.center.y = 0;
    this.camera.position.copy(this.center).add(CAM_OFFSET);
    this.camera.lookAt(this.center);
    this.camera.updateMatrixWorld();
    const inv = this.camera.matrixWorldInverse;
    const w = this.container.clientWidth || 1440, h = this.container.clientHeight || 900;
    const PANEL = w > 900 ? 330 : 0, HUD = 60;
    const aspect = w / h;
    const usable = Math.max(1, (w - PANEL) / (h - HUD));
    let need = 1;
    const corners = [bounds.min, bounds.max];
    for (const cx of [0, 1]) for (const cy of [0, 1]) for (const cz of [0, 1]) {
      const v = new THREE.Vector3(corners[cx].x, corners[cy].y, corners[cz].z).applyMatrix4(inv);
      need = Math.max(need, Math.abs(v.x) / usable, Math.abs(v.y));
    }
    this.baseFs = need * 1.06 * (h / (h - HUD));
    const pxToWorld = (2 * this.baseFs * aspect) / w;
    const right = new THREE.Vector3(1, 0, -1).normalize();
    const down = new THREE.Vector3(-1, 0, -1).normalize();
    this.center.add(right.multiplyScalar((PANEL / 2) * pxToWorld)).add(down.multiplyScalar((HUD / 2) * pxToWorld * 1.4));
    this.camera.position.copy(this.center).add(CAM_OFFSET);
    this.camera.lookAt(this.center);
    this.resize();
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
  private onClick = () => { const hit = this.pickAt(); this.opts.onPick?.(hit ? (hit.userData as PickTarget) : null); };
  private pickAt(): THREE.Object3D | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.pickables, true);
    if (!hits.length) return null;
    let o: THREE.Object3D | null = hits[0].object;
    while (o && !(o.userData && (o.userData as PickTarget).kind)) o = o.parent;
    return o;
  }

  // ======================================================== the loop
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
    for (const f of this.fires) {
      f.flames.forEach((fl, i) => { const k = 0.7 + 0.5 * Math.abs(Math.sin(t * 9 + i * 1.7)); fl.scale.set(1, k, 1); fl.position.y = f.size * (0.6 + 0.5 * k); fl.rotation.y += dt * 2; });
      f.smoke.forEach((s, i) => { const k = (t * 0.6 + i * 0.4) % 1.6; s.position.y = f.size * 2.4 + k * 4; s.position.x = Math.sin(t + i) * 0.6; (s.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - k / 1.6); });
    }
    for (const s of this.stars) { s.ring.rotation.z = t; s.bits.forEach((b, i) => { const a = t * 1.6 + (i * Math.PI * 2) / 3; b.position.set(s.ring.position.x + Math.cos(a) * 3, s.y + Math.sin(t * 3 + i) * 0.5, s.ring.position.z + Math.sin(a) * 3); b.rotation.y = t * 2; }); }
    for (const d of this.digs) {
      if (!d.active) continue;
      d.shovel.rotation.z = -0.9 + Math.sin(t * 5) * 0.5;
      d.nextClod -= dt;
      if (d.nextClod <= 0) {
        d.nextClod = 0.35 + Math.random() * 0.3;
        const c = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35), mat(COL.dirt)); c.position.set(d.site.x - 1.2, 1, d.site.z + 4.2); this.fx.add(c);
        d.clods.push({ mesh: c, v: new THREE.Vector3(2.5 + Math.random() * 2, 5 + Math.random() * 2, (Math.random() - 0.5) * 2), life: 1.1 });
      }
      for (const c of [...d.clods]) { c.life -= dt; c.v.y -= 14 * dt; c.mesh.position.addScaledVector(c.v, dt); if (c.life <= 0 || c.mesh.position.y < 0) { this.fx.remove(c.mesh); d.clods = d.clods.filter((x) => x !== c); } }
    }
    for (const trip of [...this.trips]) this.stepTrip(trip, dt);
    for (const p of [...this.puffs]) { p.life -= dt * 1.2; p.mesh.position.y += dt * 1.5; p.mesh.scale.addScalar(dt * 0.8); (p.mesh.material as THREE.MeshBasicMaterial).opacity = 0.7 * Math.max(0, p.life); if (p.life <= 0) { this.fx.remove(p.mesh); this.puffs = this.puffs.filter((x) => x !== p); } }

    const hit = this.pickAt();
    if (hit !== this.hovered) { if (this.hovered) this.hovered.scale.setScalar(1); this.hovered = hit; if (hit) hit.scale.setScalar(1.06); this.renderer.domElement.style.cursor = hit ? "pointer" : "default"; }
    this.renderer.render(this.scene, this.camera);

    if (this.opts.onLabels) {
      const w = this.container.clientWidth, h = this.container.clientHeight;
      const hv = this.hovered?.userData as PickTarget | undefined;
      const hoverKey = hv ? (hv.kind === "depot" || hv.kind === "meter" ? hv.kind : `${hv.kind}:${hv.id}`) : null;
      this.opts.onLabels(this.labelAnchors.map((a) => { const v = a.pos.clone().project(this.camera); return { key: a.key, x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h, short: a.short, title: a.title, sub: a.sub, tone: a.tone, hidden: v.z > 1, active: a.key === hoverKey }; }));
    }
  };

  private stepTrip(trip: Trip, dt: number) {
    const g = trip.van.group;
    if (trip.phase === "drop") {
      trip.dropT += dt;
      const dest = this.tankPos.get(trip.clinicId);
      if (trip.crate && dest) {
        const k = Math.min(1, trip.dropT / 0.9);
        const start = new THREE.Vector3(g.position.x, 2.5, g.position.z);
        const end = new THREE.Vector3(dest.x, 8.2, dest.z);
        trip.crate.position.lerpVectors(start, end, k); trip.crate.position.y += Math.sin(k * Math.PI) * 6; trip.crate.rotation.y += dt * 6;
        if (k >= 1) {
          this.fx.remove(trip.crate); trip.crate = null;
          const splash = this.torus(1.2, 0.25, COL.water, dest.x, 7.4, dest.z); this.fx.add(splash); this.puffs.push({ mesh: splash, life: 1 });
        }
      }
      if (trip.dropT > 1.6) {
        trip.phase = "back";
        const home = trip.van.site;
        const pts = [g.position.clone(), new THREE.Vector3(this.clinicRoadX, 0, g.position.z), new THREE.Vector3(this.clinicRoadX, 0, this.roadZ), new THREE.Vector3(home.x, 0, this.roadZ), home.clone()];
        trip.curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.05); trip.t = 0; trip.speed = 0.16;
      }
      return;
    }
    trip.t += dt * trip.speed;
    trip.puffs -= dt;
    if (trip.puffs <= 0) { trip.puffs = 0.12; this.puff(g.position); }
    if (trip.t >= 1) {
      if (trip.phase === "out") {
        trip.phase = "drop"; trip.dropT = 0;
        const crate = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), mat(COL.crate)); crate.position.set(g.position.x, 2.5, g.position.z); this.fx.add(crate); trip.crate = crate;
      } else {
        g.position.copy(trip.van.site); g.rotation.y = trip.van.rot; trip.van.busy = false;
        this.trips = this.trips.filter((x) => x !== trip);
      }
      return;
    }
    const p = trip.curve.getPoint(trip.t); const ahead = trip.curve.getPoint(Math.min(1, trip.t + 0.01));
    g.position.set(p.x, Math.abs(Math.sin(trip.t * 60)) * 0.15, p.z); g.rotation.y = Math.atan2(ahead.x - p.x, ahead.z - p.z);
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
