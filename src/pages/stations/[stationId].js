import * as THREE from "three";
import useNetwork from "@/data/network";
import { useRouter } from "next/router";
import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import styles from "@/styles/Station.module.css";
import favouriteStyles from "@/styles/Favourite.module.css";

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

const HeartSVG = ({ width = "24px", height = "24px", isFavourite }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={isFavourite ? favouriteStyles.favourite : ""}
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 20.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
  </svg>
);

export default function StationDetails() {
  const { network, isLoading, isError } = useNetwork();
  const router = useRouter();
  const refContainer = useRef(null);
  const [favourites, setFavourites] = useState([]);

  useEffect(() => {
    const favs = JSON.parse(localStorage.getItem("favourites")) || [];
    setFavourites(favs);
  }, []);

  useEffect(() => {
    if (isLoading || isError || !network || !router.query.stationId) return;

    const station = network.stations.find(
      (station) => station.id === router.query.stationId
    );

    if (!station) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      1,
      1000
    );
    camera.position.set(0, 0, 350);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
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
      color.setHSL(0.6 - height / (20 * mountainScale), 0.7, 0.5);
      return color;
    };

    const mapToScreenCoordinates = (latitude, longitude) => {
      const x = (longitude - 4.35) * (width / 0.15);
      const y = (51.3 - latitude) * (height / 0.15);
      return new THREE.Vector2(x, y);
    };

    const coords = mapToScreenCoordinates(station.latitude, station.longitude);
    const mountainScale = 5;
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
    plane.position.y = -110; //adjust to lower model
    plane.position.x = -mountainPosX;
    plane.position.z = -mountainPosZ;

    scene.add(plane);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
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
  }, [isLoading, isError, network, router.query.stationId, favourites]);

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Failed to load</div>;

  const station = network.stations.find(
    (station) => station.id === router.query.stationId
  );

  if (!station) return <div>Station not found</div>;

  const isFavourite = (id) => favourites.includes(id);

  const toggleFavourite = (id) => {
    const newFavourites = isFavourite(id)
      ? favourites.filter((favId) => favId !== id)
      : [...favourites, id];
    setFavourites(newFavourites);
    localStorage.setItem("favourites", JSON.stringify(newFavourites));
  };

  return (
    <div className={styles.stationContainer}>
      <header className={styles.header}>
        <Link href="/">
          <BackArrowIcon />
        </Link>
        <h1 className={styles.stationName}>{station.name}</h1>
        <div
          className={`${styles.heartPage}`}
          onClick={(e) => {
            e.preventDefault();
            toggleFavourite(station.id);
          }}
        >
          <HeartSVG isFavourite={isFavourite(station.id)} />
        </div>
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
