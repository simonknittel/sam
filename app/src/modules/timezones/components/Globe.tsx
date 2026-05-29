"use client";

import clsx from "clsx";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefCallback,
} from "react";
import type { GlobeMethods } from "react-globe.gl";
import GlobeGL from "react-globe.gl";
import * as THREE from "three";

const CIG_OFFICES = [
  { lat: 34.052235, lng: -118.243683 },
  { lat: 53.483959, lng: -2.244644 },
  { lat: 50.110924, lng: 8.682127 },
];

const globeMaterial = new THREE.MeshPhongMaterial({
  color: "#000000",
  emissive: "#000000",
  specular: "#000000",
  shininess: 0,
  transparent: true,
  opacity: 0.6,
});

interface Props {
  readonly className?: string;
}

export const Globe = ({ className }: Props) => {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const rafIdRef = useRef<number | null>(null);

  const [countries, setCountries] = useState<object[]>([]);

  const [width, setWidth] = useState(600);
  const [height, setHeight] = useState(600);

  // Keep globe canvas sized to its container
  const containerRef: RefCallback<HTMLDivElement> = useCallback((node) => {
    if (!node) return;

    setWidth(Math.round(node.getBoundingClientRect().width));
    setHeight(Math.round(node.getBoundingClientRect().height));

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setWidth(Math.round(entry.contentRect.width));
      setHeight(Math.round(entry.contentRect.height));
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const handleGlobeReady = useCallback(() => {
    // onGlobeReady fires during the same layout-effect cycle that initialises the
    // kapsule, before useImperativeHandle has had a chance to assign globeRef.
    // Deferring by one macrotask guarantees the ref is set.
    setTimeout(() => {
      const globe = globeRef.current;
      if (!globe) return;

      // Initial camera position: slightly tilted so Germany is front-and-centre
      globe.pointOfView({ lat: 51, lng: 10, altitude: 0.8 }, 0);

      const controls = globe.controls();
      controls.enabled = false;

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (!prefersReducedMotion) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.4;

        // Drive autoRotate explicitly — the internal render loop may not always
        // call controls.update() when the scene is otherwise idle.
        const tick = () => {
          controls.update();
          rafIdRef.current = requestAnimationFrame(tick);
        };
        rafIdRef.current = requestAnimationFrame(tick);
      }
    }, 100);
  }, []);

  // Fetch world countries GeoJSON for polygon outlines
  useEffect(() => {
    fetch("/ne_110m_admin_0_countries.geojson")
      .then((r) => r.json())
      .then((data: { features: object[] }) => setCountries(data.features))
      .catch(() => {
        /* silently skip outline layer on fetch failure */
      });
  }, []);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className={clsx("relative", className)}>
      <GlobeGL
        ref={globeRef}
        width={width}
        height={height}
        onGlobeReady={handleGlobeReady}
        backgroundColor="rgba(0,0,0,0)"
        globeOffset={[0, 30]}
        globeImageUrl={null}
        bumpImageUrl={null}
        globeMaterial={globeMaterial}
        showAtmosphere={false}
        showGraticules={true}
        polygonsData={countries}
        polygonGeoJsonGeometry="geometry"
        polygonCapColor={() => "rgba(0,0,0,0)"}
        polygonSideColor={() => "rgba(0,0,0,0)"}
        polygonStrokeColor={() => "#333"}
        polygonAltitude={0.005}
        pointsData={CIG_OFFICES}
        pointLat="lat"
        pointLng="lng"
        pointColor={() => "#f30"}
        pointRadius={1}
        pointAltitude={0.01}
        enablePointerInteraction={false}
      />
    </div>
  );
};
