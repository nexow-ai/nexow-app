"use client";

import { useRef, useMemo, useCallback, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { QuadraticBezierLine, Html, OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";

/* ── helpers ─────────────────────────────────────── */
function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

/* ── data ────────────────────────────────────────── */
const R = 2.5;

interface Hub {
  name: string;
  lat: number;
  lng: number;
  ticker?: { symbol: string; price: number; change: number };
}

const hubs: Hub[] = [
  { name: "New York", lat: 40.7, lng: -74.0, ticker: { symbol: "SPX", price: 6083.5, change: 0.67 } },
  { name: "London", lat: 51.5, lng: -0.1, ticker: { symbol: "GBP/USD", price: 1.2641, change: -0.12 } },
  { name: "Tokyo", lat: 35.7, lng: 139.7, ticker: { symbol: "NKY", price: 38842, change: 1.23 } },
  { name: "Singapore", lat: 1.3, lng: 103.8 },
  { name: "Hong Kong", lat: 22.3, lng: 114.2, ticker: { symbol: "BTC", price: 97423, change: 3.21 } },
  { name: "Frankfurt", lat: 50.1, lng: 8.7, ticker: { symbol: "EUR/USD", price: 1.0847, change: 0.08 } },
  { name: "Sydney", lat: -33.9, lng: 151.2 },
  { name: "Dubai", lat: 25.2, lng: 55.3, ticker: { symbol: "XAU", price: 2937.4, change: 0.89 } },
  { name: "Shanghai", lat: 31.2, lng: 121.5 },
  { name: "Sao Paulo", lat: -23.5, lng: -46.6 },
  { name: "Mumbai", lat: 19.1, lng: 72.9 },
  { name: "Toronto", lat: 43.7, lng: -79.4 },
  { name: "Zurich", lat: 47.4, lng: 8.5 },
  { name: "Seoul", lat: 37.6, lng: 127.0 },
  { name: "Chicago", lat: 41.9, lng: -87.6 },
];

const routes: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 6], [4, 5], [0, 5],
  [1, 7], [7, 8], [0, 9], [8, 2], [1, 10], [0, 11],
  [5, 12], [2, 13], [0, 14], [14, 1], [10, 3], [12, 5],
];

/* ── globe graticule (clean lat/lng lines, no wireframe) */
function Graticule() {
  const geometry = useMemo(() => {
    const points: number[] = [];
    const segments = 96;

    // Latitude lines every 30 degrees
    for (let lat = -60; lat <= 60; lat += 30) {
      for (let i = 0; i <= segments; i++) {
        const lng = (i / segments) * 360 - 180;
        const v = latLngToVec3(lat, lng, R * 1.001);
        points.push(v.x, v.y, v.z);
        if (i > 0 && i < segments) {
          points.push(v.x, v.y, v.z);
        }
      }
    }

    // Longitude lines every 30 degrees
    for (let lng = -180; lng < 180; lng += 30) {
      for (let i = 0; i <= segments; i++) {
        const lat = (i / segments) * 180 - 90;
        const v = latLngToVec3(lat, lng, R * 1.001);
        points.push(v.x, v.y, v.z);
        if (i > 0 && i < segments) {
          points.push(v.x, v.y, v.z);
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    return geo;
  }, []);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#10b981" transparent opacity={0.07} depthWrite={false} />
    </lineSegments>
  );
}

/* ── Fresnel atmosphere ──────────────────────────── */
function AtmosphereGlow() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: `
          varying vec3 vNormal; varying vec3 vPos;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vPos = (modelViewMatrix * vec4(position,1.0)).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
          }`,
        fragmentShader: `
          varying vec3 vNormal; varying vec3 vPos;
          void main() {
            float f = 1.0 - dot(normalize(-vPos), vNormal);
            f = pow(f, 3.5);
            vec3 c = mix(vec3(0.063,0.725,0.506), vec3(0.024,0.714,0.831), f);
            gl_FragColor = vec4(c, f * 0.45);
          }`,
        transparent: true,
        side: THREE.FrontSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  return (
    <mesh material={mat}>
      <sphereGeometry args={[R * 1.015, 64, 64]} />
    </mesh>
  );
}

/* ── hub dot with pulse ring + optional price label ─ */
function HubDot({ hub, index }: { hub: Hub; index: number }) {
  const dotRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const pos = useMemo(() => latLngToVec3(hub.lat, hub.lng, R * 1.003), [hub.lat, hub.lng]);
  const labelPos = useMemo(() => latLngToVec3(hub.lat, hub.lng, R * 1.1), [hub.lat, hub.lng]);

  const [price, setPrice] = useState(hub.ticker?.price ?? 0);
  useEffect(() => {
    if (!hub.ticker) return;
    const iv = setInterval(() => {
      setPrice((p) => p + hub.ticker!.price * (Math.random() - 0.5) * 0.0003);
    }, 1500 + index * 300);
    return () => clearInterval(iv);
  }, [hub.ticker, index]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (dotRef.current) {
      dotRef.current.scale.setScalar(1 + Math.sin(t * 2.5 + index * 1.2) * 0.2);
    }
    if (ringRef.current) {
      const phase = ((t * 0.4 + index * 0.6) % 2.5) / 2.5;
      ringRef.current.scale.setScalar(1 + phase * 4);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.25 * (1 - phase);
    }
  });

  const quat = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), pos.clone().normalize());
    return q;
  }, [pos]);

  const formatPrice = (p: number) => {
    if (p > 10000) return p.toFixed(0);
    if (p > 100) return p.toFixed(1);
    return p.toFixed(4);
  };

  return (
    <group>
      <mesh ref={dotRef} position={pos}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshBasicMaterial color="#34d399" />
      </mesh>

      <mesh ref={ringRef} position={pos} quaternion={quat}>
        <ringGeometry args={[0.05, 0.065, 32]} />
        <meshBasicMaterial color="#10b981" transparent opacity={0.25} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {hub.ticker && (
        <Html position={labelPos} center distanceFactor={7} style={{ pointerEvents: "none", userSelect: "none" }} occlude={false}>
          <div className="whitespace-nowrap rounded-md bg-zinc-900/80 backdrop-blur-sm border border-zinc-800/50 px-2 py-1 shadow-lg shadow-black/30">
            <span className="text-[10px] font-bold text-zinc-300 mr-1.5">{hub.ticker.symbol}</span>
            <span className="text-[10px] font-mono text-zinc-100">{formatPrice(price)}</span>
            <span className={`text-[9px] font-mono ml-1 ${hub.ticker.change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {hub.ticker.change >= 0 ? "+" : ""}{hub.ticker.change.toFixed(2)}%
            </span>
          </div>
        </Html>
      )}
    </group>
  );
}

/* ── trade arc with traveling light ──────────────── */
function TradeArc({ from, to, index }: { from: Hub; to: Hub; index: number }) {
  const lineRef = useRef<any>(null);
  const particleRef = useRef<THREE.Mesh>(null);

  const startVec = useMemo(() => latLngToVec3(from.lat, from.lng, R), [from]);
  const endVec = useMemo(() => latLngToVec3(to.lat, to.lng, R), [to]);
  const midVec = useMemo(() => {
    const mid = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
    mid.normalize().multiplyScalar(R + startVec.distanceTo(endVec) * 0.3);
    return mid;
  }, [startVec, endVec]);
  const curve = useMemo(() => new THREE.QuadraticBezierCurve3(startVec, midVec, endVec), [startVec, midVec, endVec]);

  useFrame(({ clock }) => {
    if (lineRef.current?.material && "dashOffset" in lineRef.current.material) {
      lineRef.current.material.dashOffset = -(clock.getElapsedTime() * 0.6 + index * 0.8);
    }
    if (particleRef.current) {
      const t = ((clock.getElapsedTime() * 0.15 + index * 0.12) % 1);
      particleRef.current.position.copy(curve.getPoint(t));
      const brightness = Math.sin(t * Math.PI);
      (particleRef.current.material as THREE.MeshBasicMaterial).opacity = brightness * 0.9;
      particleRef.current.scale.setScalar(0.7 + brightness * 0.5);
    }
  });

  return (
    <group>
      <QuadraticBezierLine
        ref={lineRef}
        start={startVec}
        end={endVec}
        mid={midVec}
        color="#10b981"
        opacity={0.2}
        transparent
        lineWidth={1}
        dashed
        dashScale={10}
        dashSize={0.3}
        gapSize={0.3}
      />
      <mesh ref={particleRef}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color="#34d399" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ── scene ────────────────────────────────────────── */
function Scene() {
  return (
    <>
      <ambientLight intensity={0.05} />

      {/* Galaxy starfield */}
      <Stars
        radius={80}
        depth={60}
        count={2500}
        factor={3}
        saturation={0.2}
        fade
        speed={0.5}
      />

      <group position={[1.2, 0, 0]}>
        {/* Clean wireframe sphere — 28 segments for visible but elegant cells */}
        <mesh>
          <sphereGeometry args={[R, 28, 28]} />
          <meshBasicMaterial color="#10b981" wireframe transparent opacity={0.06} depthWrite={false} />
        </mesh>

        <AtmosphereGlow />

        {hubs.map((hub, i) => <HubDot key={hub.name} hub={hub} index={i} />)}
        {routes.map(([from, to], i) => <TradeArc key={`r-${from}-${to}`} from={hubs[from]} to={hubs[to]} index={i} />)}
      </group>

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.4}
        minPolarAngle={Math.PI * 0.25}
        maxPolarAngle={Math.PI * 0.75}
      />
    </>
  );
}

export function HeroScene() {
  return (
    <div className="absolute inset-0" style={{ zIndex: 0 }}>
      <Canvas
        camera={{ position: [0, 0, 7], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent", position: "absolute", inset: 0 }}
      >
        <Scene />
      </Canvas>
      <div className="pointer-events-none absolute inset-0 bg-zinc-950/30" />
    </div>
  );
}
