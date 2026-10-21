"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { DesignScene, Dieline, Panel, PanelRole } from "@/lib/types";
import { renderSceneToCanvas } from "@/lib/render/konva-scene";
import { hingedOnBack } from "@/lib/generator/generate";

export interface BoxPreviewHandle {
  snapshot: () => HTMLCanvasElement | null;
}

function crop(src: HTMLCanvasElement, p: Panel, px: number, rotate180 = false): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(2, Math.round(p.w * px));
  c.height = Math.max(2, Math.round(p.h * px));
  const ctx = c.getContext("2d")!;
  if (rotate180) { ctx.translate(c.width, c.height); ctx.rotate(Math.PI); }
  ctx.drawImage(src, p.x * px, p.y * px, p.w * px, p.h * px, 0, 0, c.width, c.height);
  return c;
}

/**
 * Aperçu 3D réaliste : la boîte est montée à partir des panneaux détectés sur le gabarit
 * (face, dos, côtés, dessus, dessous) avec les dimensions réelles du volume.
 */
export const BoxPreview = forwardRef<BoxPreviewHandle, { scene: DesignScene; dieline: Dieline; autoRotate?: boolean; className?: string; interactive?: boolean }>(
  function BoxPreview({ scene, dieline, autoRotate = true, className = "", interactive = true }, ref) {
    const mount = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const renderOnce = useRef<() => void>(() => undefined);
    const [ready, setReady] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
      snapshot: () => {
        const r = rendererRef.current;
        if (!r) return null;
        renderOnce.current();
        const c = document.createElement("canvas");
        c.width = r.domElement.width;
        c.height = r.domElement.height;
        const ctx = c.getContext("2d")!;
        ctx.fillStyle = "#f4f4f7";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(r.domElement, 0, 0);
        return c;
      },
    }));

    useEffect(() => {
      const el = mount.current;
      if (!el) return;
      let disposed = false;
      let frame = 0;
      setReady(false);

      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      } catch {
        setError("WebGL n'est pas disponible sur cet appareil.");
        return;
      }
      rendererRef.current = renderer;
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      el.appendChild(renderer.domElement);

      const three = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      three.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

      const { lengthMm: L, heightMm: H, depthMm: D } = dieline.box;
      const size = Math.max(L, H, D);
      const camera = new THREE.PerspectiveCamera(30, 1, 1, size * 20);
      camera.position.set(size * 1.5, size * 1.15, size * 2.4);

      const key = new THREE.DirectionalLight(0xffffff, 1.6);
      key.position.set(size * 1.2, size * 2.2, size * 1.6);
      key.castShadow = true;
      key.shadow.mapSize.set(2048, 2048);
      const sc = key.shadow.camera as THREE.OrthographicCamera;
      sc.left = sc.bottom = -size * 1.5;
      sc.right = sc.top = size * 1.5;
      sc.far = size * 8;
      key.shadow.radius = 6;
      three.add(key, new THREE.HemisphereLight(0xffffff, 0xe8e4f0, 0.35));

      const ground = new THREE.Mesh(new THREE.PlaneGeometry(size * 8, size * 8), new THREE.ShadowMaterial({ opacity: 0.18 }));
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -H / 2 - 0.2;
      ground.receiveShadow = true;
      three.add(ground);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.enablePan = false;
      controls.enabled = interactive;
      controls.autoRotate = autoRotate;
      controls.autoRotateSpeed = 1.4;
      controls.minDistance = size * 1.2;
      controls.maxDistance = size * 6;
      controls.maxPolarAngle = Math.PI * 0.62;

      const resize = () => {
        const w = el.clientWidth, h = el.clientHeight || w;
        renderer.setSize(w, h, false);
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(el);

      const materials: THREE.Material[] = [];
      const textures: THREE.Texture[] = [];
      let mesh: THREE.Mesh | null = null;

      (async () => {
        const px = Math.min(6, 2048 / Math.max(L, H));
        const flat = await renderSceneToCanvas(scene, dieline, { px });
        if (disposed) return;
        const find = (r: PanelRole) => dieline.panels.find((p) => p.role === r);
        const top = find("top");
        const bottom = find("bottom");
        const topOnBack = !!top && hingedOnBack(top, dieline);
        const bottomOnBack = !!bottom && hingedOnBack(bottom, dieline);
        const faces: [PanelRole, boolean][] = [["right", false], ["left", false], ["top", topOnBack], ["bottom", bottomOnBack], ["front", false], ["back", false]];
        const maxAniso = renderer.capabilities.getMaxAnisotropy();
        for (const [role, rot] of faces) {
          const panel = find(role);
          let mat: THREE.MeshStandardMaterial;
          if (panel) {
            const tex = new THREE.CanvasTexture(crop(flat, panel, px, rot));
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.anisotropy = maxAniso;
            textures.push(tex);
            mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0, envMapIntensity: 0.6 });
          } else {
            // Fourreau : dessus/dessous ouverts → barquette blanche
            mat = new THREE.MeshStandardMaterial({ color: role === "top" || role === "bottom" ? 0xf3f3f1 : new THREE.Color(scene.palette.primary), roughness: 0.35 });
          }
          materials.push(mat);
        }
        const geo = new THREE.BoxGeometry(L, H, D);
        mesh = new THREE.Mesh(geo, materials);
        mesh.castShadow = true;
        three.add(mesh);
        // Arêtes légèrement marquées pour l'effet carton
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.12 }));
        mesh.add(edges);
        setReady(true);
      })().catch(() => setError("Impossible de construire l'aperçu 3D."));

      const tick = () => {
        controls.update();
        renderer.render(three, camera);
        frame = requestAnimationFrame(tick);
      };
      renderOnce.current = () => renderer.render(three, camera);
      tick();

      return () => {
        disposed = true;
        cancelAnimationFrame(frame);
        ro.disconnect();
        controls.dispose();
        textures.forEach((t) => t.dispose());
        materials.forEach((m) => m.dispose());
        mesh?.geometry.dispose();
        pmrem.dispose();
        renderer.dispose();
        renderer.domElement.remove();
        rendererRef.current = null;
      };
    }, [scene, dieline, autoRotate, interactive]);

    return (
      <div className={`relative overflow-hidden rounded-xl bg-gradient-to-b from-ink-50 to-ink-100 ${className}`}>
        <div ref={mount} className="absolute inset-0" />
        {!ready && !error && <div className="absolute inset-0 grid place-items-center text-sm text-ink-400">Montage de la boîte…</div>}
        {error && <div className="absolute inset-0 grid place-items-center p-4 text-center text-sm text-ink-500">{error}</div>}
      </div>
    );
  },
);
