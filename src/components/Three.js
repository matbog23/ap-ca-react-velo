import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { useRouter } from "next/router";
import styles from "@/styles/Canvas.module.css";

function MyThree() {
  const refContainer = useRef(null);
  const [bikeStations, setBikeStations] = useState([]);
  const router = useRouter();

  // Variable to control the scale of the mountains
  const mountainScale = 2; // Adjust as needed
  // Variable to control the amount of smoothing
  const smoothingFactor = 0.5; // Adjust as needed

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
    camera.position.set(0, 50 * mountainScale, 50 * mountainScale); // Move camera closer to the peaks and scale accordingly
    camera.lookAt(new THREE.Vector3(0, 0, 0)); // Look at the center of the scene

    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000); // Set background color to black

    if (refContainer.current) {
      refContainer.current.appendChild(renderer.domElement);
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableRotate = true;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.zoomSpeed = 1.2;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const mapToScreenCoordinates = (latitude, longitude) => {
      const x = (longitude - 4.35) * (width / 0.15);
      const y = (51.3 - latitude) * (height / 0.15);
      return new THREE.Vector2(x, y);
    };

    // Create a single plane geometry
    const planeGeometry = new THREE.PlaneGeometry(
      width,
      height,
      200 * mountainScale,
      200 * mountainScale
    ); // Increase segments for finer detail and scale accordingly

    // Add color attribute to the geometry
    const colors = [];
    for (let i = 0; i < planeGeometry.attributes.position.count; i++) {
      colors.push(0, 0, 0); // Initial color set to black
    }
    planeGeometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colors, 3)
    );

    const planeMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true, // Enable vertex colors
      side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2; // Rotate to lay flat
    scene.add(plane);

    // Elevate vertices based on latitude and longitude
    bikeStations.forEach((station) => {
      const coords = mapToScreenCoordinates(
        station.latitude,
        station.longitude
      );

      // Calculate index of the vertex closest to station coordinates
      const index = Math.floor(
        (coords.x / width) * planeGeometry.parameters.widthSegments +
          Math.floor(
            (coords.y / height) * planeGeometry.parameters.heightSegments
          ) *
            (planeGeometry.parameters.widthSegments + 1)
      );

      if (index >= 0 && index < planeGeometry.attributes.position.count) {
        // Elevate the vertex
        const elevation = station.freeBikes * 0.2 * mountainScale; // Adjust elevation scale as needed and scale accordingly
        planeGeometry.attributes.position.setZ(index, elevation);

        // Color the vertex based on elevation
        let color;
        if (station.freeBikes > 6) {
          color = new THREE.Color(0xffffff); // White for peaks
        } else if (station.freeBikes > 2) {
          color = new THREE.Color(0x808080); // Stone gray for middle part
        } else {
          color = new THREE.Color(0x000000); // Grass green for bottom
        }
        planeGeometry.attributes.color.setXYZ(index, color.r, color.g, color.b);
      }
    });

    // Smooth out the mountains
    smoothVertices(planeGeometry, smoothingFactor);

    planeGeometry.attributes.position.needsUpdate = true;
    planeGeometry.attributes.color.needsUpdate = true;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (event) => {
      event.preventDefault();
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        const clickedObject = intersects[0].object;
        if (clickedObject.userData.id) {
          router.push(`/stations/${clickedObject.userData.id}`);
        }
      }
    };

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("click", handleClick);

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("click", handleClick);
      if (refContainer.current) {
        refContainer.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [bikeStations, router, mountainScale, smoothingFactor]); // Add mountainScale and smoothingFactor to dependency array

  return <div ref={refContainer} className={styles.canvasMap}></div>;
}

export default MyThree;

function smoothVertices(geometry, factor) {
  const smoothPositions = [];
  for (let i = 0; i < geometry.attributes.position.count; i++) {
    const vertex = new THREE.Vector3().fromBufferAttribute(
      geometry.attributes.position,
      i
    );
    const neighbors = findNeighbors(geometry, i);
    let average = vertex.clone();
    neighbors.forEach((neighbor) =>
      average.add(
        new THREE.Vector3().add(
          new THREE.Vector3().fromBufferAttribute(
            geometry.attributes.position,
            neighbor
          )
        )
      )
    );
    average.divideScalar(neighbors.length + 1);
    smoothPositions.push(average);
  }

  // Update the positions with the smoothed ones
  for (let i = 0; i < geometry.attributes.position.count; i++) {
    geometry.attributes.position.setXYZ(
      i,
      smoothPositions[i].x * factor +
        geometry.attributes.position.getX(i) * (1 - factor),
      smoothPositions[i].y * factor +
        geometry.attributes.position.getY(i) * (1 - factor),
      smoothPositions[i].z * factor +
        geometry.attributes.position.getZ(i) * (1 - factor)
    );
  }
}

function findNeighbors(geometry, index) {
  const neighbors = [];
  const widthSegments = geometry.parameters.widthSegments;
  const heightSegments = geometry.parameters.heightSegments;
  const totalVertices = (widthSegments + 1) * (heightSegments + 1);

  if (index % (widthSegments + 1) > 0) {
    // Left neighbor
    neighbors.push(index - 1);
  }
  if (index % (widthSegments + 1) < widthSegments) {
    // Right neighbor
    neighbors.push(index + 1);
  }
  if (Math.floor(index / (widthSegments + 1)) > 0) {
    // Top neighbor
    neighbors.push(index - (widthSegments + 1));
  }
  if (Math.floor(index / (widthSegments + 1)) < heightSegments) {
    // Bottom neighbor
    neighbors.push(index + (widthSegments + 1));
  }

  return neighbors;
}
