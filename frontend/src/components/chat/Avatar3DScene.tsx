"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

import type { FaceScanData } from "@/lib/faceScan";

type SceneProps = {
  speaking: boolean;
  faceScan?: FaceScanData | null;
};

function RealFaceMesh({
  faceScan,
  speaking,
}: {
  faceScan: FaceScanData;
  speaking: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const basePositions = useRef<Float32Array | null>(null);

  const { geometry, fitScale } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(faceScan.vertices, 3),
    );
    geo.setAttribute("color", new THREE.Float32BufferAttribute(faceScan.colors, 3));
    geo.setIndex(faceScan.indices);
    geo.computeBoundingBox();
    geo.center();
    geo.computeVertexNormals();

    const size = new THREE.Vector3();
    geo.boundingBox?.getSize(size);
    const fitScale = 1.35 / Math.max(size.x, size.y, size.z, 0.001);

    const centered = geo.getAttribute("position") as THREE.BufferAttribute;
    basePositions.current = new Float32Array(centered.array);

    return { geometry: geo, fitScale };
  }, [faceScan]);

  useFrame((state) => {
    const position = geometry.getAttribute("position") as THREE.BufferAttribute;
    const base = basePositions.current;
    if (!position || !base) return;

    const t = state.clock.elapsedTime;
    const jawOpen = speaking ? 0.012 + Math.sin(t * 12) * 0.006 : 0;

    for (let i = 0; i < position.count; i += 1) {
      const y = base[i * 3 + 1];
      if (y < -0.12) {
        position.setZ(i, base[i * 3 + 2] + jawOpen);
      }
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
  });

  return (
    <mesh ref={meshRef} geometry={geometry} scale={fitScale}>
      <meshStandardMaterial
        vertexColors
        roughness={0.62}
        metalness={0}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function ProceduralHead({ speaking }: { speaking: boolean }) {
  const jawRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (jawRef.current) {
      const t = state.clock.elapsedTime;
      const open = speaking ? 0.04 + Math.sin(t * 12) * 0.02 : 0;
      jawRef.current.position.y = -0.55 - open;
    }
  });

  return (
    <group>
      <mesh scale={[1, 1.15, 1]}>
        <sphereGeometry args={[0.9, 32, 32]} />
        <meshStandardMaterial color="#f2c9a0" roughness={0.65} />
      </mesh>
      <mesh ref={jawRef} position={[0, -0.55, 0.08]}>
        <sphereGeometry args={[0.45, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#e8b995" roughness={0.65} />
      </mesh>
    </group>
  );
}

function SceneContent({ speaking, faceScan }: SceneProps) {
  const fallback = (
    <mesh>
      <sphereGeometry args={[0.9, 24, 24]} />
      <meshStandardMaterial color="#f2c9a0" />
    </mesh>
  );

  return (
    <>
      <color attach="background" args={["#f8fafc"]} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[0, 0.4, 2.2]} intensity={1.1} />
      <directionalLight position={[-1.2, 0.2, 1]} intensity={0.45} color="#fff8f0" />
      <directionalLight position={[1.2, -0.1, 0.8]} intensity={0.2} />
      <Suspense fallback={fallback}>
        {faceScan ? (
          <RealFaceMesh faceScan={faceScan} speaking={speaking} />
        ) : (
          <ProceduralHead speaking={speaking} />
        )}
      </Suspense>
      <OrbitControls
        enablePan={false}
        enableZoom
        enableRotate
        minDistance={1.6}
        maxDistance={3.5}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={(Math.PI * 3) / 4}
        target={[0, 0, 0]}
      />
    </>
  );
}

type Avatar3DSceneProps = {
  speaking: boolean;
  photoUrl?: string | null;
  faceScan?: FaceScanData | null;
  className?: string;
};

export function Avatar3DScene({
  speaking,
  faceScan,
  className,
}: Avatar3DSceneProps) {
  return (
    <div className={`relative ${className ?? ""}`} style={{ height: 360, width: "100%" }}>
      <p className="pointer-events-none absolute inset-x-0 top-1 z-10 text-center text-[10px] text-muted-foreground">
        Drag to rotate · scroll to zoom
      </p>
      <Canvas
        camera={{ position: [0, 0, 2.3], fov: 36, near: 0.1, far: 20 }}
        gl={{ antialias: true, alpha: false }}
        style={{ height: 360, width: "100%", display: "block" }}
        dpr={[1, 2]}
      >
        <SceneContent speaking={speaking} faceScan={faceScan} />
      </Canvas>
    </div>
  );
}
