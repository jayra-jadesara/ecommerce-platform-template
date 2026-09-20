"use client";

import { useEffect } from "react";
import { useReducedMotion } from "framer-motion";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  rotation: number;
  spin: number;
  shape: "rect" | "circle";
};

const COLORS = [
  "#E53935",
  "#FB8C00",
  "#FDD835",
  "#43A047",
  "#1E88E5",
  "#8E24AA",
  "#EC407A",
  "#FFFFFF",
];

function spawnBurst(
  particles: Particle[],
  originX: number,
  originY: number,
  angleDeg: number,
  count: number,
) {
  const angle = (angleDeg * Math.PI) / 180;
  for (let i = 0; i < count; i += 1) {
    const spread = (Math.random() - 0.5) * 0.85;
    const speed = 3.2 + Math.random() * 4.5;
    const dir = angle + spread;
    particles.push({
      x: originX,
      y: originY,
      vx: Math.cos(dir) * speed,
      vy: Math.sin(dir) * speed - (1 + Math.random() * 2),
      life: 0,
      maxLife: 110 + Math.random() * 70,
      size: 4 + Math.random() * 5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.18,
      shape: Math.random() > 0.45 ? "rect" : "circle",
    });
  }
}

/**
 * Google Pay–style firecracker / confetti bursts from left and right
 * on order/payment success. Respects prefers-reduced-motion.
 */
export function OrderSuccessCelebration() {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    if (typeof window === "undefined") return;

    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText =
      "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:250;";
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      canvas.remove();
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: Particle[] = [];
    const w = () => window.innerWidth;
    const h = () => window.innerHeight;

    // Dual side cannons (GPay-style)
    spawnBurst(particles, 0, h() * 0.62, -25, 55);
    spawnBurst(particles, w(), h() * 0.62, 205, 55);

    // Follow-up pops (paced)
    const t1 = window.setTimeout(() => {
      spawnBurst(particles, w() * 0.08, h() * 0.45, -15, 28);
      spawnBurst(particles, w() * 0.92, h() * 0.45, 195, 28);
    }, 480);
    const t2 = window.setTimeout(() => {
      spawnBurst(particles, w() * 0.12, h() * 0.7, -35, 22);
      spawnBurst(particles, w() * 0.88, h() * 0.7, 215, 22);
    }, 980);

    let frame = 0;
    let raf = 0;
    const gravity = 0.11;
    const drag = 0.992;

    const tick = () => {
      frame += 1;
      ctx.clearRect(0, 0, w(), h());

      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const p = particles[i]!;
        p.life += 1;
        p.vy += gravity;
        p.vx *= drag;
        p.vy *= drag;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.spin;

        const fade = 1 - p.life / p.maxLife;
        if (fade <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.min(1, fade * 1.35);
        ctx.fillStyle = p.color;
        if (p.shape === "rect") {
          ctx.fillRect(-p.size * 0.35, -p.size * 0.9, p.size * 0.7, p.size * 1.8);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (particles.length > 0 || frame < 180) {
        raf = window.requestAnimationFrame(tick);
      } else {
        canvas.remove();
        window.removeEventListener("resize", resize);
      }
    };

    raf = window.requestAnimationFrame(tick);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.remove();
    };
  }, [reduceMotion]);

  return null;
}
