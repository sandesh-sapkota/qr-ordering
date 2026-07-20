"use client";

// The react-three-fiber hero scene: a floating, gently rotating smartphone
// whose screen shows a stylized SG Thali ordering UI (drawn to a canvas
// texture, so no external assets). Loaded only on the client via next/dynamic.

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const SCREEN_W = 512;
const SCREEN_H = 1024;

/** Draws a believable ordering UI onto an offscreen 2D canvas. */
function drawOrderingUI(ctx: CanvasRenderingContext2D) {
  const w = SCREEN_W;
  const h = SCREEN_H;

  const rr = (x: number, y: number, bw: number, bh: number, r: number) => {
    ctx.beginPath();
    ctx.roundRect(x, y, bw, bh, r);
  };

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#101014");
  bg.addColorStop(1, "#050506");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Header
  ctx.fillStyle = "#71717a";
  ctx.font = "500 22px system-ui, sans-serif";
  ctx.fillText("9:41", 36, 52);
  ctx.textAlign = "right";
  ctx.fillText("SG Thali", w - 36, 52);
  ctx.textAlign = "left";

  ctx.fillStyle = "#fafafa";
  ctx.font = "700 40px system-ui, sans-serif";
  ctx.fillText("Table 5 · Menu", 36, 128);

  // Hero banner
  const banner = ctx.createLinearGradient(36, 0, w - 36, 0);
  banner.addColorStop(0, "#f59e0b");
  banner.addColorStop(1, "#fb7185");
  ctx.fillStyle = banner;
  rr(36, 160, w - 72, 150, 28);
  ctx.fill();
  ctx.fillStyle = "#1c1005";
  ctx.font = "700 34px system-ui, sans-serif";
  ctx.fillText("Chef's Thali Set", 64, 232);
  ctx.font = "500 24px system-ui, sans-serif";
  ctx.fillText("Rice · Dal · 3 curries", 64, 272);

  // Category pills
  const pills = ["Momo", "Thali", "Chowmein", "Drinks"];
  let px = 36;
  pills.forEach((label, i) => {
    ctx.font = "600 24px system-ui, sans-serif";
    const pw = ctx.measureText(label).width + 44;
    ctx.fillStyle = i === 0 ? "#f59e0b" : "#27272a";
    rr(px, 344, pw, 56, 28);
    ctx.fill();
    ctx.fillStyle = i === 0 ? "#1c1005" : "#a1a1aa";
    ctx.fillText(label, px + 22, 380);
    px += pw + 16;
  });

  // Menu rows
  const items: [string, string][] = [
    ["Steamed Momo", "Rs 180"],
    ["Veg Thali", "Rs 320"],
    ["Chicken Chowmein", "Rs 240"],
  ];
  let ry = 432;
  items.forEach(([name, price]) => {
    ctx.fillStyle = "#18181b";
    rr(36, ry, w - 72, 120, 24);
    ctx.fill();
    ctx.fillStyle = "#3f3f46";
    rr(56, ry + 20, 80, 80, 18);
    ctx.fill();
    ctx.fillStyle = "#fafafa";
    ctx.font = "600 28px system-ui, sans-serif";
    ctx.fillText(name, 156, ry + 58);
    ctx.fillStyle = "#f59e0b";
    ctx.font = "700 26px system-ui, sans-serif";
    ctx.fillText(price, 156, ry + 96);
    // add button
    ctx.fillStyle = "#27272a";
    rr(w - 116, ry + 34, 60, 52, 16);
    ctx.fill();
    ctx.fillStyle = "#f59e0b";
    ctx.font = "700 34px system-ui, sans-serif";
    ctx.fillText("+", w - 96, ry + 71);
    ry += 140;
  });

  // Bottom order bar
  const btn = ctx.createLinearGradient(36, 0, w - 36, 0);
  btn.addColorStop(0, "#f59e0b");
  btn.addColorStop(1, "#fbbf24");
  ctx.fillStyle = btn;
  rr(36, h - 128, w - 72, 88, 30);
  ctx.fill();
  ctx.fillStyle = "#1c1005";
  ctx.font = "700 30px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Place order · Rs 740", w / 2, h - 76);
  ctx.textAlign = "left";
}

function useScreenTexture(): THREE.CanvasTexture | null {
  const texture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = SCREEN_W;
    canvas.height = SCREEN_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    drawOrderingUI(ctx);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }, []);

  useEffect(() => {
    return () => {
      texture?.dispose();
    };
  }, [texture]);

  return texture;
}

function Phone() {
  const texture = useScreenTexture();

  return (
    <Float speed={1.4} rotationIntensity={0.5} floatIntensity={0.7}>
      <group rotation={[0.1, -0.35, 0]}>
        {/* Body */}
        <mesh castShadow>
          <boxGeometry args={[1.7, 3.4, 0.22]} />
          <meshStandardMaterial
            color="#0b0b0d"
            metalness={0.9}
            roughness={0.35}
          />
        </mesh>
        {/* Amber rim glow */}
        <mesh position={[0, 0, -0.02]}>
          <boxGeometry args={[1.78, 3.48, 0.18]} />
          <meshStandardMaterial
            color="#f59e0b"
            emissive="#f59e0b"
            emissiveIntensity={0.6}
            roughness={0.4}
          />
        </mesh>
        {/* Screen */}
        <mesh position={[0, 0, 0.121]}>
          <planeGeometry args={[1.5, 3.16]} />
          {texture ? (
            <meshBasicMaterial map={texture} toneMapped={false} />
          ) : (
            <meshBasicMaterial color="#101014" />
          )}
        </mesh>
      </group>
    </Float>
  );
}

/** Eases the camera toward the pointer for a subtle parallax effect. */
function CameraParallax() {
  const { camera, pointer } = useThree();
  const target = useRef(new THREE.Vector3(0, 0, 6));

  useFrame(() => {
    target.current.set(pointer.x * 0.7, pointer.y * 0.5, 6);
    camera.position.lerp(target.current, 0.05);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

export default function HeroCanvas() {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 6], fov: 30 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%" }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 6, 5]} intensity={2.2} />
      <pointLight position={[-4, -2, 3]} intensity={30} color="#fb7185" />
      <pointLight position={[3, 1, 4]} intensity={24} color="#f59e0b" />
      <Phone />
      <CameraParallax />
    </Canvas>
  );
}
