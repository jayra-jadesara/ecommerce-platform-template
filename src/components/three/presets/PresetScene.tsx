"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, Stars } from "@react-three/drei";
import type { Group, Mesh } from "three";
import type { Visual3dPreset, Visual3dQuality } from "@/features/visual-effects/schemas";
import { qualityRenderHints } from "@/features/visual-effects/schemas";

export type ThemeColorSet = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
};

type SceneProps = {
  preset: Visual3dPreset;
  quality: Visual3dQuality;
  colors: ThemeColorSet;
  reducedMotion: boolean;
  rotationSpeed?: number;
};

function FloatingShapes({
  colors,
  quality,
  reducedMotion,
  rotationSpeed = 0.25,
}: Omit<SceneProps, "preset">) {
  const group = useRef<Group>(null);
  const hints = qualityRenderHints(quality);
  const meshes = useMemo(() => {
    const palette = [colors.primary, colors.accent, colors.secondary];
    return Array.from({ length: hints.shapeCount }, (_, i) => ({
      key: i,
      color: palette[i % palette.length]!,
      position: [
        (i - hints.shapeCount / 2) * 0.9,
        (i % 2 === 0 ? 0.4 : -0.3) * (1 + i * 0.05),
        -0.2 * i,
      ] as [number, number, number],
      scale: 0.35 + (i % 3) * 0.12,
    }));
  }, [colors, hints.shapeCount]);

  useFrame((_, delta) => {
    if (reducedMotion || !group.current) return;
    group.current.rotation.y += delta * rotationSpeed * 0.4;
  });

  return (
    <group ref={group}>
      {meshes.map((item) => (
        <Float
          key={item.key}
          speed={reducedMotion ? 0 : 1.2}
          rotationIntensity={reducedMotion ? 0 : 0.4}
          floatIntensity={reducedMotion ? 0 : 0.6}
        >
          <mesh position={item.position} scale={item.scale}>
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
              color={item.color}
              roughness={0.35}
              metalness={0.15}
            />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

function SoftGeometry({
  colors,
  reducedMotion,
  rotationSpeed = 0.2,
}: Omit<SceneProps, "preset" | "quality">) {
  const mesh = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (reducedMotion || !mesh.current) return;
    mesh.current.rotation.x += delta * rotationSpeed * 0.3;
    mesh.current.rotation.y += delta * rotationSpeed * 0.5;
  });
  return (
    <mesh ref={mesh} scale={1.4}>
      <torusKnotGeometry args={[0.55, 0.18, 96, 16]} />
      <meshStandardMaterial
        color={colors.primary}
        roughness={0.4}
        metalness={0.2}
        emissive={colors.accent}
        emissiveIntensity={0.08}
      />
    </mesh>
  );
}

function ProductOrbit({
  colors,
  reducedMotion,
  rotationSpeed = 0.35,
}: Omit<SceneProps, "preset" | "quality">) {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    if (reducedMotion || !group.current) return;
    group.current.rotation.y += delta * rotationSpeed;
  });
  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshStandardMaterial color={colors.primary} roughness={0.3} metalness={0.25} />
      </mesh>
      <mesh position={[1.1, 0.2, 0]} scale={0.22}>
        <boxGeometry />
        <meshStandardMaterial color={colors.accent} />
      </mesh>
      <mesh position={[-1.0, -0.15, 0.2]} scale={0.18}>
        <octahedronGeometry />
        <meshStandardMaterial color={colors.secondary} />
      </mesh>
    </group>
  );
}

function AbstractParticles({
  colors,
  quality,
  reducedMotion,
}: Omit<SceneProps, "preset">) {
  const hints = qualityRenderHints(quality);
  if (reducedMotion) {
    return (
      <mesh>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial color={colors.accent} transparent opacity={0.5} />
      </mesh>
    );
  }
  return (
    <Stars
      radius={4}
      depth={20}
      count={hints.particleCount}
      factor={2}
      saturation={0}
      fade
      speed={0.4}
    />
  );
}

/**
 * Allow-listed 3D scene content. Never accepts arbitrary shaders/JS from config.
 */
export function PresetScene(props: SceneProps) {
  const { preset, quality, colors, reducedMotion, rotationSpeed = 0.25 } = props;

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[3, 4, 2]}
        intensity={1.1}
        castShadow={qualityRenderHints(quality).enableShadows}
        color={colors.background}
      />
      <pointLight position={[-2, 1, 3]} intensity={0.5} color={colors.accent} />

      {preset === "FLOATING_SHAPES" ? (
        <FloatingShapes
          colors={colors}
          quality={quality}
          reducedMotion={reducedMotion}
          rotationSpeed={rotationSpeed}
        />
      ) : null}
      {preset === "SOFT_GEOMETRY" ? (
        <SoftGeometry
          colors={colors}
          reducedMotion={reducedMotion}
          rotationSpeed={rotationSpeed}
        />
      ) : null}
      {preset === "PRODUCT_ORBIT" ? (
        <ProductOrbit
          colors={colors}
          reducedMotion={reducedMotion}
          rotationSpeed={rotationSpeed}
        />
      ) : null}
      {preset === "ABSTRACT_PARTICLES" ? (
        <AbstractParticles
          colors={colors}
          quality={quality}
          reducedMotion={reducedMotion}
          rotationSpeed={rotationSpeed}
        />
      ) : null}
    </>
  );
}
