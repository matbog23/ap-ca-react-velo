import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { Vector2 } from "three";
import { useRouter } from "next/router";
import styles from "@/styles/Canvas.module.css";

function MyThree() {
  const refContainer = useRef(null);
  const [bikeStations, setBikeStations] = useState([]);
  const router = useRouter();

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
    const camera = new THREE.OrthographicCamera(
      window.innerWidth / -2,
      window.innerWidth / 2,
      window.innerHeight / 2,
      window.innerHeight / -2,
      1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    if (refContainer.current) {
      refContainer.current.appendChild(renderer.domElement);
    }

    const mapToScreenCoordinates = (latitude, longitude) => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const x = (longitude - 4.35) * (width / 0.15); // Antwerp longitude range
      const y = (51.3 - latitude) * (height / 0.15); // Antwerp latitude range
      return new Vector2(x, y);
    };

    bikeStations.forEach((station) => {
      const coords = mapToScreenCoordinates(
        station.latitude,
        station.longitude
      );
      let color = 0x000000; // Default color: black
      if (station.freeBikes === 0) {
        color = 0x000000; // Black: no bikes available
      } else if (station.freeBikes < 2) {
        color = 0xff0000; // Red: less than 2 bikes available
      } else if (station.freeBikes < 6) {
        color = 0xffa500; // Orange: less than 6 bikes available
      } else {
        color = 0x008000; // Green: more than 6 bikes available
      }

      const geometry = new THREE.CircleGeometry(5, 32); // Adjusted size of points
      const material = new THREE.MeshBasicMaterial({ color });
      const dot = new THREE.Mesh(geometry, material);
      dot.position.set(
        coords.x - window.innerWidth / 2,
        window.innerHeight / 2 - coords.y,
        0
      );
      dot.userData.id = station.id;
      scene.add(dot);
    });

    camera.position.z = 100;

    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      camera.left = window.innerWidth / -2;
      camera.right = window.innerWidth / 2;
      camera.top = window.innerHeight / 2;
      camera.bottom = window.innerHeight / -2;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const handleClick = (event) => {
      const mouse = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(scene.children);
      if (intersects.length > 0) {
        const clickedObject = intersects[0].object;
        if (clickedObject.userData.id) {
          router.push(`/stations/${clickedObject.userData.id}`);
        }
      }
    };

    window.addEventListener("resize", handleResize);
    renderer.domElement.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("click", handleClick);
      if (refContainer.current) {
        refContainer.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [bikeStations, router]);

  return <div ref={refContainer} className={styles.canvasMap}></div>;
}

export default MyThree;
