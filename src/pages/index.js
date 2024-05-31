import { useEffect, useState } from "react";
import Link from "next/link";

import styles from "@/styles/Home.module.css";
import headerStyles from "@/styles/Header.module.css";
import favouriteStyles from "@/styles/Favourite.module.css";
import SearchBar from "@/components/SearchBar";
import Popup from "@/components/Popup";
import MyThree from "@/components/Three";
import useNetwork from "@/data/network";

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

export default function Home() {
  const [filter, setFilter] = useState("");
  const [favourites, setFavourites] = useState([]);
  const { network, isLoading, isError } = useNetwork();

  useEffect(() => {
    const favs = JSON.parse(localStorage.getItem("favourites")) || [];
    setFavourites(favs);
  }, []);

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Failed to load</div>;

  const favouriteStations = network.stations.filter((station) =>
    favourites.includes(station.id)
  );

  const stations = network.stations.filter(
    (station) => station.name.toLowerCase().indexOf(filter.toLowerCase()) >= 0
  );

  function handleFilterChange(e) {
    setFilter(e.target.value);
  }

  const isFavourite = (id) => favourites.includes(id);

  const toggleFavourite = (id) => {
    const newFavourites = isFavourite(id)
      ? favourites.filter((favId) => favId !== id)
      : [...favourites, id];
    setFavourites(newFavourites);
    localStorage.setItem("favourites", JSON.stringify(newFavourites));
  };

  return (
    <div>
      <Popup stations={stations}>
        <h1>Antwerp Vélo</h1>
        <h2>Find Stations</h2>
        <SearchBar value={filter} onChange={handleFilterChange} />
        <div className="popup-scrollable">
          <ul>
            {stations.map((station) => (
              <Link
                className="station-link"
                href={`/stations/${station.id}`}
                key={station.id}
              >
                <li>
                  <div>
                    {station.name} - {station.free_bikes} bikes
                  </div>
                  <div
                    className={`${favouriteStyles.heart}`}
                    onClick={(e) => {
                      e.preventDefault();
                      toggleFavourite(station.id);
                    }}
                  >
                    <HeartSVG isFavourite={isFavourite(station.id)} />
                  </div>
                </li>
              </Link>
            ))}
          </ul>
        </div>
        <h2>Favourites</h2>
        <div className="popup-scrollable">
          <ul>
            {favouriteStations.map((station) => (
              <Link
                className="station-link"
                href={`/stations/${station.id}`}
                key={station.id}
              >
                <li>
                  <div>
                    {station.name} - {station.free_bikes} bikes
                  </div>
                  <div
                    className={`${favouriteStyles.heart}`}
                    onClick={(e) => {
                      e.preventDefault();
                      toggleFavourite(station.id);
                    }}
                  >
                    <HeartSVG isFavourite={isFavourite(station.id)} />
                  </div>
                </li>
              </Link>
            ))}
          </ul>
        </div>
      </Popup>
      <div className={styles.container}>
        <MyThree
          bikeStations={stations.map((station) => ({
            coords: station.coords,
            isFavourite: isFavourite(station.id),
          }))}
        />
      </div>
    </div>
  );
}
