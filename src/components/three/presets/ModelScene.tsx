"use client";

import { useEffect, useRef } from "react";
import { Center, PresentationControls, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";

type ModelSceneProps = {
  url: string;
  reducedMotion: boolean;
};

/**
 * Loads a trusted GLB/GLTF URL (caller must validate storage path).
 * Failures bubble to ThreeErrorBoundary → 2D fallback.
 */
export function ModelScene({ url, reducedMotion }: ModelSceneProps) {
  const groupRef = useRef<Group>(null);
  const gltf = useGLTF(url);

  useFrame((_, delta) => {
    if (reducedMotion || !groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.25;
  });

  useEffect(() => {
    return () => {
      try {
        useGLTF.clear(url);
      } catch {
        // ignore
      }
    };
  }, [url]);

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 3, 2]} intensity={1} />
      <PresentationControls
        enabled={!reducedMotion}
        global={false}
        cursor={true}
        speed={1}
        zoom={1}
        polar={[-0.4, 0.4]}
        azimuth={[-0.8, 0.8]}
      >
        <Center>
          <group ref={groupRef}>
            <primitive object={gltf.scene.clone()} />
          </group>
        </Center>
      </PresentationControls>
    </>
  );
}
