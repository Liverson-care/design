"use client";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { DesignScene, Dieline } from "@/lib/types";
import { renderSceneToCanvas } from "./konva-scene";
import { buildPackModel, type PackModel, type PackRenderOptions } from "./three-pack";
import { contactShadowTexture, gradientTexture, priceTagTexture, woodTexture } from "./procedural";

export type Backdrop = "studio-clair" | "studio-sombre" | "table-bois" | "rayon";
export type Angle = "trois-quarts" | "face" | "plongee" | "profil";

export const BACKDROPS: { key: Backdrop; label: string }[] = [
  { key: "studio-clair", label: "Studio clair" },
  { key: "studio-sombre", label: "Studio sombre" },
  { key: "table-bois", label: "Table en bois" },
  { key: "rayon", label: "En rayon" },
];

export const ANGLES: { key: Angle; label: string }[] = [
  { key: "trois-quarts", label: "Trois-quarts" },
  { key: "face", label: "Face" },
  { key: "plongee", label: "Plongée" },
  { key: "profil", label: "Profil" },
];

const DIRS: Record<Angle, [number, number, number]> = {
  "trois-quarts": [0.95, 0.5, 1.55],
  face: [0, 0.12, 1],
  plongee: [0.55, 1.35, 1],
  profil: [1.5, 0.3, 0.75],
};

export interface StageOptions extends PackRenderOptions {
  backdrop: Backdrop;
  angle: Angle;
  /** Nombre de facings en rayon */
  facings?: number;
}

/**
 * Studio de rendu réaliste : lumière trois points, ombres douces haute définition,
 * environnement réfléchissant, mises en scène (studio, table, linéaire de magasin).
 */
export class PackStage {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(28, 1, 1, 50000);
  private controls: OrbitControls;
  private pmrem: THREE.PMREMGenerator;
  private disposables: { dispose: () => void }[] = [];
  private model: PackModel | null = null;
  private raf = 0;
  private ro: ResizeObserver;
  private target = new THREE.Vector3();
  private size = 100;

  constructor(private host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(this.renderer.domElement);
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = this.pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.maxPolarAngle = Math.PI * 0.55;
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.resize();
    const tick = () => { this.controls.update(); this.renderer.render(this.scene, this.camera); this.raf = requestAnimationFrame(tick); };
    tick();
  }

  private resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private track<T extends { dispose: () => void }>(o: T): T {
    this.disposables.push(o);
    return o;
  }

  private clear() {
    this.model?.dispose();
    this.model = null;
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
    for (const c of [...this.scene.children]) this.scene.remove(c);
  }

  async build(design: DesignScene, dieline: Dieline, opts: StageOptions) {
    const px = Math.min(10, 4096 / Math.max(dieline.widthMm, dieline.heightMm));
    const flat = await renderSceneToCanvas(design, dieline, { px });
    this.clear();
    const model = buildPackModel(design, dieline, flat, px, this.renderer.capabilities.getMaxAnisotropy(), { ...opts, realistic: true });
    this.model = model;
    const s = model.size;
    this.size = s;
    this.backdrop = opts.backdrop;
    const floorY = model.groundY;
    const r = this.renderer;
    r.toneMappingExposure = opts.backdrop === "studio-sombre" ? 1.15 : opts.backdrop === "rayon" ? 1.05 : 1;

    // Lumières : principale (ombres), d'appoint, contre-jour
    const key = new THREE.DirectionalLight(opts.backdrop === "table-bois" ? 0xfff1dc : 0xffffff, opts.backdrop === "studio-sombre" ? 2.2 : 1.7);
    // Lumière principale haute et latérale : l'ombre portée reste visible derrière l'emballage
    key.position.set(s * 2.4, s * 2.8, s * 0.9);
    key.castShadow = true;
    key.shadow.mapSize.set(4096, 4096);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.6;
    key.shadow.radius = 5;
    const sc = key.shadow.camera as THREE.OrthographicCamera;
    sc.left = sc.bottom = -s * 3;
    sc.right = sc.top = s * 3;
    sc.near = 1;
    sc.far = s * 12;
    const rim = new THREE.DirectionalLight(0xffffff, opts.backdrop === "studio-sombre" ? 2.4 : 0.9);
    rim.position.set(-s * 2, s * 1.4, -s * 2.2);
    const fill = new THREE.HemisphereLight(0xffffff, opts.backdrop === "table-bois" ? 0x7a5a3a : 0xdcd8e6, opts.backdrop === "studio-sombre" ? 0.25 : 0.5);
    this.scene.add(key, rim, fill);

    const group = new THREE.Group();
    if (opts.backdrop === "rayon") {
      // Linéaire : plusieurs facings, tablette métallique, étiquette prix, voisins neutres
      const n = Math.max(1, Math.min(5, opts.facings ?? 3));
      const box = new THREE.Box3().setFromObject(model.object);
      const w = box.max.x - box.min.x, dpt = box.max.z - box.min.z;
      for (let i = 0; i < n; i++) {
        const o = i === 0 ? model.object : model.object.clone();
        o.position.x = (i - (n - 1) / 2) * w * 1.04;
        o.traverse((c) => { if ((c as THREE.Mesh).isMesh) (c as THREE.Mesh).castShadow = true; });
        group.add(o);
      }
      const totalW = n * w * 1.04 + w * 2.6;
      const shelfMat = this.track(new THREE.MeshStandardMaterial({ color: 0xd9dbe0, roughness: 0.35, metalness: 0.6 }));
      const shelfGeo = this.track(new THREE.BoxGeometry(totalW, s * 0.05, dpt * 1.7));
      const shelf = new THREE.Mesh(shelfGeo, shelfMat);
      shelf.position.set(0, floorY - s * 0.025, -dpt * 0.25);
      shelf.receiveShadow = true;
      const tagTex = this.track(priceTagTexture("2,99 €"));
      const stripMat = this.track(new THREE.MeshStandardMaterial({ map: tagTex, roughness: 0.6 }));
      const stripGeo = this.track(new THREE.BoxGeometry(w * 1.1, s * 0.09, 1.5));
      const strip = new THREE.Mesh(stripGeo, stripMat);
      strip.position.set(0, floorY - s * 0.05, dpt * 0.62);
      const railGeo = this.track(new THREE.BoxGeometry(totalW, s * 0.1, 1));
      const rail = new THREE.Mesh(railGeo, this.track(new THREE.MeshStandardMaterial({ color: 0x2a2d35, roughness: 0.5 })));
      rail.position.set(0, floorY - s * 0.05, dpt * 0.6);
      const backGeo = this.track(new THREE.PlaneGeometry(totalW, s * 3));
      const back = new THREE.Mesh(backGeo, this.track(new THREE.MeshStandardMaterial({ color: 0xe7e8ec, roughness: 0.9 })));
      back.position.set(0, floorY + s * 1.2, -dpt * 1.1);
      back.receiveShadow = true;
      for (const side of [-1, 1]) {
        const nb = new THREE.Mesh(this.track(new THREE.BoxGeometry(w * 0.95, (box.max.y - box.min.y) * 0.92, dpt)), this.track(new THREE.MeshStandardMaterial({ color: side < 0 ? 0xb9c2cf : 0xd7c9b6, roughness: 0.6 })));
        nb.position.set(side * (n * w * 1.04) / 2 + side * w * 0.62, floorY + (box.max.y - box.min.y) * 0.46, 0);
        nb.castShadow = true;
        group.add(nb);
      }
      group.add(shelf, rail, strip, back);
      for (const o of group.children.slice(0, n)) group.add(this.contactShadow(o, floorY + 0.2));
      this.scene.background = this.track(gradientTexture("#f4f5f8", "#cfd3db"));
    } else {
      group.add(model.object);
      model.object.traverse((c) => { if ((c as THREE.Mesh).isMesh) (c as THREE.Mesh).castShadow = true; });
      const floorGeo = this.track(new THREE.PlaneGeometry(s * 40, s * 40));
      let floor: THREE.Mesh;
      if (opts.backdrop === "table-bois") {
        const wood = this.track(woodTexture());
        wood.repeat.set(14, 14);
        wood.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
        floor = new THREE.Mesh(floorGeo, this.track(new THREE.MeshStandardMaterial({ map: wood, roughness: 0.7 })));
        this.scene.background = this.track(gradientTexture("#efe5d7", "#b49a7e"));
      } else {
        floor = new THREE.Mesh(floorGeo, this.track(new THREE.ShadowMaterial({ opacity: opts.backdrop === "studio-sombre" ? 0.55 : 0.28 })));
        this.scene.background = this.track(opts.backdrop === "studio-sombre" ? gradientTexture("#3b3a45", "#121217") : gradientTexture("#fbfaf8", "#e3e0d9"));
      }
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = floorY;
      floor.receiveShadow = true;
      group.add(floor);
      group.add(this.contactShadow(model.object, floorY));
    }
    this.scene.add(group);
    const bb = new THREE.Box3().setFromObject(opts.backdrop === "rayon" ? group.children[0] : model.object);
    bb.getCenter(this.target);
    if (opts.backdrop === "rayon") this.target.x = 0;
    this.setAngle(opts.angle, opts.backdrop === "rayon" ? (opts.facings ?? 3) : 1);
  }

  /** Plan d'ombre de contact sous un objet (empreinte légèrement élargie) */
  private contactShadow(o: THREE.Object3D, y: number): THREE.Mesh {
    const bb = new THREE.Box3().setFromObject(o);
    const w = (bb.max.x - bb.min.x) * 1.35, d = (bb.max.z - bb.min.z) * 1.6;
    const tex = this.track(contactShadowTexture());
    const plane = new THREE.Mesh(this.track(new THREE.PlaneGeometry(w, d)), this.track(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.85 })));
    plane.rotation.x = -Math.PI / 2;
    plane.position.set((bb.min.x + bb.max.x) / 2, y + 0.15, (bb.min.z + bb.max.z) / 2);
    plane.renderOrder = 1;
    return plane;
  }

  private backdrop: Backdrop = "studio-clair";

  setAngle(angle: Angle, spread = 1) {
    // En rayon, le point de vue est celui d'un client face au linéaire
    const base = this.backdrop === "rayon" && angle === "trois-quarts" ? ([0.28, 0.2, 1] as [number, number, number]) : DIRS[angle];
    const d = new THREE.Vector3(...base).normalize();
    const dist = this.size * (2.9 + (spread - 1) * 0.55);
    this.camera.position.copy(this.target).addScaledVector(d, dist);
    this.camera.near = this.size * 0.05;
    this.camera.far = this.size * 60;
    this.camera.updateProjectionMatrix();
    this.controls.target.copy(this.target);
    this.controls.minDistance = this.size * 1.2;
    this.controls.maxDistance = this.size * 8;
    this.controls.update();
  }

  /** Capture haute définition (largeur en pixels), indépendante de la taille à l'écran */
  snapshot(width: number): HTMLCanvasElement {
    const r = this.renderer;
    const el = r.domElement;
    const prev = { w: el.width, h: el.height, ratio: r.getPixelRatio(), aspect: this.camera.aspect };
    const aspect = this.host.clientWidth / (this.host.clientHeight || 1);
    const height = Math.round(width / aspect);
    r.setPixelRatio(1);
    r.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    r.render(this.scene, this.camera);
    const out = document.createElement("canvas");
    out.width = width;
    out.height = height;
    out.getContext("2d")!.drawImage(el, 0, 0);
    r.setPixelRatio(prev.ratio);
    this.resize();
    return out;
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.controls.dispose();
    this.clear();
    this.pmrem.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
