"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { DesignScene, Dieline } from "@/lib/types";
import { renderSceneToCanvas } from "@/lib/render/konva-scene";
import { buildPackModel, type PackModel } from "@/lib/render/three-pack";

export interface BoxPreviewHandle {
  snapshot: () => HTMLCanvasElement | null;
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

      const size = dieline.packType === "etiquette" ? Math.max(dieline.box.lengthMm, dieline.box.heightMm * 1.5) : Math.max(dieline.box.lengthMm, dieline.box.heightMm, dieline.box.depthMm);
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

      let model: PackModel | null = null;

      (async () => {
        const px = Math.min(6, 2048 / Math.max(dieline.widthMm, dieline.heightMm));
        const flat = await renderSceneToCanvas(scene, dieline, { px });
        if (disposed) return;
        model = buildPackModel(scene, dieline, flat, px, renderer.capabilities.getMaxAnisotropy());
        ground.position.y = model.groundY;
        three.add(model.object);
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
        model?.dispose();
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
