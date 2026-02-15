"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const vertexShader = `
  varying vec3 vPos;
  void main() {
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  varying vec3 vPos;

  void main() {
    float gridSize = 1.2;
    vec2 coord = vPos.xz / gridSize;
    vec2 grid = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
    float line = min(grid.x, grid.y);
    float gridAlpha = 1.0 - min(line, 1.0);

    float dist = length(vPos.xz);
    float wave1 = sin(dist * 0.6 - uTime * 2.0) * 0.5 + 0.5;
    float wave2 = sin(dist * 0.3 - uTime * 1.0 + 1.5) * 0.5 + 0.5;
    float pulse = wave1 * 0.7 + wave2 * 0.3;

    float fade = 1.0 - smoothstep(3.0, 12.0, dist);

    vec3 emerald = vec3(0.063, 0.725, 0.506);
    vec3 cyan = vec3(0.024, 0.714, 0.831);
    vec3 color = mix(emerald, cyan, pulse * 0.4);

    float alpha = gridAlpha * fade * (0.2 + pulse * 0.35);
    gl_FragColor = vec4(color, alpha);
  }
`;

function Grid() {
  const uniformsRef = useRef({ uTime: { value: 0 } });

  useFrame(({ clock }) => {
    uniformsRef.current.uTime.value = clock.getElapsedTime();
  });

  const shaderMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: uniformsRef.current,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    []
  );

  return (
    <mesh
      rotation={[-Math.PI / 2.2, 0, 0]}
      position={[0, -2, -2]}
      material={shaderMaterial}
    >
      <planeGeometry args={[40, 40, 1, 1]} />
    </mesh>
  );
}

export function ArenaGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      <Canvas
        camera={{ position: [0, 5, 10], fov: 45, near: 0.1, far: 100 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent", position: "absolute", inset: 0 }}
      >
        <Grid />
      </Canvas>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-zinc-950/90 via-zinc-950/30 to-zinc-950/90" />
    </div>
  );
}
