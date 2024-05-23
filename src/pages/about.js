import styles from "@/styles/Home.module.css";
import { useState } from "react";

import useNetwork from "@/data/network";

export default function Home() {
  const { network, isLoading, isError } = useNetwork();

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Failed to load</div>;

  return (
    <div>
      <h1>About {network.name}</h1>
    </div>
  );
}
