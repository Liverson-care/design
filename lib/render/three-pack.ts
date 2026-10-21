"use client";
import * as THREE from "three";
import type { DesignScene, Dieline, Panel, PanelRole } from "@/lib/types";
import { hingedOnBack } from "@/lib/generator/generate";

export interface PackModel {
  object: THREE.Object3D;
  /** Plus grande dimension (mm), pour cadrer la caméra */
  size: number;
  /** Altitude du sol sous l'objet */
  groundY: number;
  dispose: () => void;
}

function crop(src: HTMLCanvasElement, p: { x: number; y: number; w: number; h: number }, px: number, rotate180 = false): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(2, Math.round(p.w * px));
  c.height = Math.max(2, Math.round(p.h * px));
  const ctx = c.getContext("2d")!;
  if (rotate180) { ctx.translate(c.width, c.height); ctx.rotate(Math.PI); }
  ctx.drawImage(src, p.x * px, p.y * px, p.w * px, p.h * px, 0, 0, c.width, c.height);
  return c;
}

/**
 * Construit le volume monté selon le type d'emballage :
 * étui / fourreau / autre → boîte ; sachet → boîte plate soudée ; étiquette → pot cylindrique habillé.
 */
export function buildPackModel(scene: DesignScene, dieline: Dieline, flat: HTMLCanvasElement, px: number, maxAniso: number): PackModel {
  const textures: THREE.Texture[] = [];
  const materials: THREE.Material[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const tex = (c: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAniso;
    textures.push(t);
    return t;
  };
  const mat = <M extends THREE.Material>(m: M) => (materials.push(m), m);
  const geo = <G extends THREE.BufferGeometry>(g: G) => (geometries.push(g), g);
  const dispose = () => { textures.forEach((t) => t.dispose()); materials.forEach((m) => m.dispose()); geometries.forEach((g) => g.dispose()); };
  const group = new THREE.Group();

  if (dieline.packType === "etiquette") {
    const R = dieline.box.lengthMm / 2;
    const labelH = dieline.box.heightMm;
    const jarH = labelH * 1.32;
    const front = dieline.panels.find((p) => p.role === "front");
    const thetaLength = dieline.labelMode === "enveloppante" ? (2 * Math.PI) / 1.02 : dieline.widthMm / R;
    const frontU = front ? (front.x + front.w / 2) / dieline.widthMm : 0.5;
    const body = new THREE.Mesh(geo(new THREE.CylinderGeometry(R, R * 0.98, jarH, 96)), mat(new THREE.MeshPhysicalMaterial({ color: 0xf4f2ee, roughness: 0.25, clearcoat: 0.6 })));
    body.castShadow = true;
    const labelTex = tex(crop(flat, { x: 0, y: 0, w: dieline.widthMm, h: dieline.heightMm }, px));
    const label = new THREE.Mesh(
      geo(new THREE.CylinderGeometry(R * 1.004, R * 1.004, labelH, 128, 1, true, -frontU * thetaLength, thetaLength)),
      mat(new THREE.MeshStandardMaterial({ map: labelTex, roughness: 0.45, side: THREE.DoubleSide })),
    );
    label.position.y = -jarH * 0.04;
    const lidH = jarH * 0.14;
    const lid = new THREE.Mesh(geo(new THREE.CylinderGeometry(R * 0.92, R * 0.92, lidH, 96)), mat(new THREE.MeshStandardMaterial({ color: new THREE.Color(scene.palette.primary), roughness: 0.35, metalness: 0.35 })));
    lid.position.y = jarH / 2 + lidH / 2 - 0.5;
    lid.castShadow = true;
    group.add(body, label, lid);
    return { object: group, size: Math.max(2 * R, jarH + lidH), groundY: -jarH / 2 - 0.2, dispose };
  }

  const { lengthMm: L, heightMm: H, depthMm: D } = dieline.box;
  const find = (r: PanelRole) => dieline.panels.find((p) => p.role === r);
  const faceMaterial = (role: PanelRole): THREE.Material => {
    const panel: Panel | undefined = find(role);
    if (!panel) {
      const color = role === "top" || role === "bottom" ? 0xf3f3f1 : new THREE.Color(scene.palette.primary);
      return mat(new THREE.MeshStandardMaterial({ color, roughness: 0.35 }));
    }
    const flip = (role === "top" || role === "bottom") && hingedOnBack(panel, dieline);
    return mat(new THREE.MeshStandardMaterial({ map: tex(crop(flat, panel, px, flip)), roughness: dieline.packType === "sachet" ? 0.3 : 0.5, envMapIntensity: 0.6 }));
  };
  const box = new THREE.Mesh(geo(new THREE.BoxGeometry(L, H, D)), (["right", "left", "top", "bottom", "front", "back"] as PanelRole[]).map(faceMaterial));
  box.castShadow = true;
  box.add(new THREE.LineSegments(geo(new THREE.EdgesGeometry(box.geometry)), mat(new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.12 }))));
  group.add(box);
  if (dieline.packType === "sachet") {
    // Soudure haute du sachet
    const seal = new THREE.Mesh(geo(new THREE.BoxGeometry(L * 1.01, H * 0.05, D * 0.35)), mat(new THREE.MeshStandardMaterial({ color: new THREE.Color(scene.palette.primary).multiplyScalar(0.8), roughness: 0.4 })));
    seal.position.y = H / 2 + H * 0.022;
    group.add(seal);
  }
  return { object: group, size: Math.max(L, H, D), groundY: -H / 2 - 0.2, dispose };
}
