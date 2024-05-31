import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { useRouter } from "next/router";
import styles from "@/styles/Canvas.module.css";

function MyThree() {
  const refContainer = useRef(null);
  const [bikeStations, setBikeStations] = useState([]);
  const router = useRouter();
  const mountainScale = 5; // Adjust as needed

  useEffect(() => {
    const fetchStations = async () => {
      try {
        const response = await fetch(
          "http://api.citybik.es/v2/networks/velo-antwerpen"
        );
        const data = await response.json();
        const stations = data.network.stations.map((station) => ({
          id: station.id,
          latitude: station.latitude,
          longitude: station.longitude,
          freeBikes: station.free_bikes,
        }));
        setBikeStations(stations);
      } catch (error) {
        console.error("Failed to fetch stations", error);
      }
    };

    fetchStations();
  }, []);

  useEffect(() => {
    if (bikeStations.length === 0) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      1,
      3000
    );
    camera.position.set(-100, 200, 500);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000);

    if (refContainer.current) {
      refContainer.current.appendChild(renderer.domElement);
    }

    const width = window.innerWidth;
    const height = window.innerHeight;

    const mapToScreenCoordinates = (latitude, longitude) => {
      const x = (longitude - 4.35) * (width / 0.15);
      const y = (51.3 - latitude) * (height / 0.15);
      return new THREE.Vector2(x, y);
    };

    const planeGeometry = new THREE.PlaneGeometry(width, height, 100, 100);
    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
    });
    const vertices = planeGeometry.attributes.position;
    const colors = new Float32Array(vertices.count * 3);
    const defaultColor = new THREE.Color(0.5, 0.5, 0.5); // Default dull color
    const applyColorGradient = (height) => {
      const color = new THREE.Color();
      color.setHSL(0.6 - height / (20 * mountainScale), 0.7, 0.5);
      return color;
    };

    bikeStations.forEach((station) => {
      const coords = mapToScreenCoordinates(
        station.latitude,
        station.longitude
      );

      for (let i = 0; i < vertices.count; i++) {
        const vertex = new THREE.Vector3();
        vertex.fromBufferAttribute(vertices, i);
        const distance = vertex.distanceTo(
          new THREE.Vector3(coords.x - width / 2, -coords.y + height / 2, 0)
        );

        const influence = Math.max(0, 1 - distance / (width / 10));
        const vertexHeight = influence * station.freeBikes * mountainScale;

        if (vertexHeight > vertices.getZ(i)) {
          vertices.setZ(i, vertexHeight);

          const color = applyColorGradient(vertexHeight);
          colors[i * 3] = color.r;
          colors[i * 3 + 1] = color.g;
          colors[i * 3 + 2] = color.b;
        }
      }
    });

    planeGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const plane = new THREE.Mesh(planeGeometry, material);
    plane.rotation.x = -Math.PI / 2;
    scene.add(plane);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50).normalize();
    scene.add(directionalLight);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };

    window.addEventListener("resize", handleResize);
    animate();

    const canvas = refContainer.current;

    const handleClick = (event) => {
      event.preventDefault();
      const mouse = new THREE.Vector2();
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObject(plane, true);

      if (intersects.length > 0) {
        const clickedPoint = intersects[0].point;

        let closestStation = null;
        let minDistance = Infinity;
        bikeStations.forEach((station) => {
          const coords = mapToScreenCoordinates(
            station.latitude,
            station.longitude
          );
          const distance = clickedPoint.distanceTo(
            new THREE.Vector3(coords.x - width / 2, -coords.y + height / 2, 0)
          );
          if (distance < minDistance) {
            minDistance = distance;
            closestStation = station;
          }
        });

        if (closestStation) {
          router.push(`/stations/${closestStation.id}`);
        }
      }
    };

    canvas.addEventListener("click", handleClick);

    return () => {
      canvas.removeEventListener("click", handleClick);
      if (canvas && renderer.domElement.parentElement === canvas) {
        canvas.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [bikeStations, router, mountainScale]);

  return <div ref={refContainer} className={styles.canvasMap}></div>;
}

export default MyThree;
