import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import useNetwork from "@/data/network";
import { useRouter } from "next/router";
import Link from "next/link";
import styles from "@/styles/Station.module.css";

const BackArrowIcon = () => (
  <svg
    className={styles.backArrow}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M15 18L9 12L15 6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function StationDetails() {
  const { network, isLoading, isError } = useNetwork();
  const router = useRouter();
  const refContainer = useRef(null);

  useEffect(() => {
    if (isLoading || isError || !network) return;

    const station = network.stations.find(
      (station) => station.id === router.query.stationId
    );

    if (!station) return;

    const scene = new THREE.Scene();

    // Set up camera to look straight at the mountain
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      1,
      1000
    );
    camera.position.set(0, 0, 500); // Adjust the camera position
    camera.lookAt(new THREE.Vector3(0, 20, 0)); // Look at the center of the scene

    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    if (refContainer.current) {
      refContainer.current.appendChild(renderer.domElement);
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const planeGeometry = new THREE.PlaneGeometry(width, height, 100, 100);
    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
    });
    const vertices = planeGeometry.attributes.position;
    const colors = new Float32Array(vertices.count * 3);

    const applyColorGradient = (height) => {
      const color = new THREE.Color();
      color.setHSL(0.6 - height / (20 * station.free_bikes), 0.7, 0.5);
      return color;
    };

    const mapToScreenCoordinates = (latitude, longitude) => {
      const x = (longitude - 4.35) * (width / 0.15);
      const y = (51.3 - latitude) * (height / 0.15);
      return new THREE.Vector2(x, y);
    };

    const coords = mapToScreenCoordinates(station.latitude, station.longitude);
    const mountainScale = 5;

    // Variables to store the position of the mountain
    let mountainPosX = 0;
    let mountainPosZ = 0;

    for (let i = 0; i < vertices.count; i++) {
      const vertex = new THREE.Vector3();
      vertex.fromBufferAttribute(vertices, i);
      const distance = vertex.distanceTo(
        new THREE.Vector3(coords.x - width / 2, -coords.y + height / 2, 0)
      );

      const influence = Math.max(0, 1 - distance / (width / 10));
      const vertexHeight = influence * station.free_bikes * mountainScale;

      if (vertexHeight > vertices.getZ(i)) {
        vertices.setZ(i, vertexHeight);

        // Calculate position of the mountain
        if (vertexHeight > mountainPosZ) {
          mountainPosX = vertex.x;
          mountainPosZ = vertex.z;
        }

        const color = applyColorGradient(vertexHeight);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }
    }

    planeGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const plane = new THREE.Mesh(planeGeometry, material);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = 0;
    plane.position.x = -mountainPosX; // Offset plane position to center the mountain
    plane.position.z = -mountainPosZ;

    scene.add(plane);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50).normalize();
    scene.add(directionalLight);

    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (refContainer.current) {
        refContainer.current.removeChild(renderer.domElement);
      }
    };
  }, [isLoading, isError, network, router.query.stationId]);

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Failed to load</div>;

  const station = network.stations.find(
    (station) => station.id === router.query.stationId
  );

  if (!station) return <div>Station not found</div>;

  return (
    <div className={styles.stationContainer}>
      <header className={styles.header}>
        <Link href="/">
          <BackArrowIcon />
        </Link>
        <h1 className={styles.stationName}>{station.name}</h1>
      </header>
      <div className={styles.stationDetails}>
        <p>
          <strong>Location:</strong> {station.latitude}, {station.longitude}
        </p>
        <p>
          <strong>Free Slots:</strong> {station.empty_slots}
        </p>
        <p>
          <strong>Available Bikes:</strong> {station.free_bikes}
        </p>
      </div>
      <div ref={refContainer} className={styles.canvasContainer}></div>
    </div>
  );
}
