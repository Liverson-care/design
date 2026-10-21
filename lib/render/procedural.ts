"use client";
import * as THREE from "three";

/** Petit bruit pseudo-aléatoire déterministe */
function rand(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

/** Grain du carton / papier : carte de relief (bump) en niveaux de gris */
export function paperGrain(size = 512, strength = 26): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const r = rand(7);
  for (let i = 0; i < size * size; i++) {
    const v = 128 + (r() - 0.5) * strength * 2;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  // fibres légères
  ctx.globalAlpha = 0.08;
  for (let k = 0; k < 900; k++) {
    ctx.strokeStyle = r() > 0.5 ? "#fff" : "#000";
    ctx.beginPath();
    const x = r() * size, y = r() * size, a = r() * Math.PI;
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Plateau de table en bois (couleur) */
export function woodTexture(size = 1024): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const r = rand(3);
  const planks = 5;
  for (let p = 0; p < planks; p++) {
    const y0 = (p * size) / planks;
    const base = [150 + r() * 25, 104 + r() * 18, 66 + r() * 14];
    ctx.fillStyle = `rgb(${base.map(Math.round).join(",")})`;
    ctx.fillRect(0, y0, size, size / planks);
    for (let k = 0; k < 60; k++) {
      const yy = y0 + r() * (size / planks);
      ctx.strokeStyle = `rgba(${r() > 0.5 ? "70,40,20" : "200,160,110"},${0.08 + r() * 0.12})`;
      ctx.lineWidth = 1 + r() * 3;
      ctx.beginPath();
      ctx.moveTo(0, yy);
      for (let x = 0; x <= size; x += 32) ctx.lineTo(x, yy + Math.sin(x / (60 + r() * 80) + k) * (2 + r() * 4));
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(40,22,10,.55)";
    ctx.fillRect(0, y0, size, 3);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Fond dégradé (studio / arrière-plan flou) */
export function gradientTexture(top: string, bottom: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 512;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Étiquette prix de linéaire (rayon) */
export function priceTagTexture(price: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = "#ffd400";
  ctx.fillRect(300, 0, 212, 128);
  ctx.fillStyle = "#111";
  ctx.font = "700 64px Inter, sans-serif";
  ctx.fillText(price, 320, 86);
  ctx.font = "500 22px Inter, sans-serif";
  ctx.fillText("Prix au kg : —,— €", 20, 50);
  ctx.fillText("Réf. 0000000", 20, 90);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Ombre de contact : dégradé radial sombre, posé sous l'objet (occlusion ambiante au sol) */
export function contactShadowTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
  g.addColorStop(0, "rgba(0,0,0,0.75)");
  g.addColorStop(0.45, "rgba(0,0,0,0.35)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}
