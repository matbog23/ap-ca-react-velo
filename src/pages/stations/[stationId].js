import useNetwork from "@/data/network";
import { useRouter } from "next/router";

export default function Home() {
  const { network, isLoading, isError } = useNetwork();
  const router = useRouter();

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Failed to load</div>;

  const station = network.stations.find(
    (station) => station.id === router.query.stationId
  );

  return (
    <div>
      <h1>{station.name}</h1>
      <p>{station.free_bikes}</p>
    </div>
  );
}
