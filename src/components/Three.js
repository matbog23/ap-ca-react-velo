import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { useRouter } from "next/router";
import styles from "@/styles/Canvas.module.css";

function MyThree() {
  const refContainer = useRef(null);
  const [bikeStations, setBikeStations] = useState([]);
  const router = useRouter();

  // Variable to control the scale of the mountains
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
      60, // FOV
      window.innerWidth / window.innerHeight,
      1,
      3000
    );
    camera.position.set(0, 300, 500); // Higher position to look more down
    camera.lookAt(new THREE.Vector3(0, 0, 0)); // Look at the center of the scene

    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000); // Set background color to black

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

    // Create a plane geometry for the mountain range
    const planeGeometry = new THREE.PlaneGeometry(width, height, 100, 100);

    // Create a material with vertex colors
    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
    });

    const vertices = planeGeometry.attributes.position;
    const colors = new Float32Array(vertices.count * 3);

    // Helper function to apply gradient color based on height
    const applyColorGradient = (height) => {
      const color = new THREE.Color();
      color.setHSL(0.6 - height / (20 * mountainScale), 1, 0.5);
      return color;
    };

    // Modify vertices to create mountains
    bikeStations.forEach((station) => {
      const coords = mapToScreenCoordinates(
        station.latitude,
        station.longitude
      );

      // Adjust heights of surrounding vertices for a smoother transition
      for (let i = 0; i < vertices.count; i++) {
        const vertex = new THREE.Vector3();
        vertex.fromBufferAttribute(vertices, i);
        const distance = vertex.distanceTo(
          new THREE.Vector3(coords.x - width / 2, -coords.y + height / 2, 0)
        );

        // Influence range and falloff for smooth transitions
        const influence = Math.max(0, 1 - distance / (width / 10));
        const vertexHeight = influence * station.freeBikes * mountainScale;

        if (vertexHeight > vertices.getZ(i)) {
          vertices.setZ(i, vertexHeight);

          // Apply gradient color based on height
          const color = applyColorGradient(vertexHeight);
          colors[i * 3] = color.r;
          colors[i * 3 + 1] = color.g;
          colors[i * 3 + 2] = color.b;
        }
      }
    });

    planeGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    // Create a mesh for the plane
    const plane = new THREE.Mesh(planeGeometry, material);
    plane.rotation.x = -Math.PI / 2; // Rotate to make it horizontal
    scene.add(plane);

    // Add user data for raycasting
    plane.userData.stations = bikeStations;

    // Lighting for the scene
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Soft white light
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50).normalize();
    scene.add(directionalLight);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (event) => {
      event.preventDefault();
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObject(plane, true);

      if (intersects.length > 0) {
        const clickedPoint = intersects[0].point;

        // Find the closest station to the clicked point
        let closestStation = null;
        let minDistance = Infinity;
        plane.userData.stations.forEach((station) => {
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

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const handleMouseDown = (event) => {
      isDragging = true;
      previousMousePosition = { x: event.clientX, y: event.clientY };
    };

    const handleMouseMove = (event) => {
      if (isDragging) {
        const deltaX = event.clientX - previousMousePosition.x;
        previousMousePosition = { x: event.clientX, y: event.clientY };

        camera.position.x -= deltaX * 0.5;
        camera.lookAt(new THREE.Vector3(0, 0, 0));
      }
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleMouseWheel = (event) => {
      camera.position.z += event.deltaY * 0.1;
      camera.lookAt(new THREE.Vector3(0, 0, 0));
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("click", handleClick);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("wheel", handleMouseWheel);

    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("click", handleClick);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("wheel", handleMouseWheel);
      if (refContainer.current) {
        refContainer.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [bikeStations, router, mountainScale]); // Add mountainScale to dependency

  return <div ref={refContainer} className={styles.canvasMap}></div>;
}

export default MyThree;
