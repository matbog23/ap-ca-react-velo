import styles from "@/styles/Home.module.css";
import headerStyles from "@/styles/Header.module.css";
import favouriteStyles from "@/styles/Favourite.module.css";

import { useEffect, useState } from "react";
import Popup from "@/components/Popup";
import MyThree from "@/components/Three"; // Make sure you import MyThree correctly
import useNetwork from "@/data/network";
import Link from "next/link";

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
  const [filter, setFilter] = useState(""); //filter is an empty string - will act as search
  const [favourites, setFavourites] = useState([]); //favourites is an empty array
  const { network, isLoading, isError } = useNetwork();

  useEffect(() => {
    console.log(localStorage.getItem("favourites"));
    const favs = JSON.parse(localStorage.getItem("favourites")) || [];
    setFavourites(favs);
  }, []); //load favourites from local storage

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Failed to load</div>;

  const favouriteStations = network.stations.filter((station) =>
    favourites.includes(station.id)
  ); //filter stations based on the favourites

  const stations = network.stations.filter(
    (station) => station.name.toLowerCase().indexOf(filter.toLowerCase()) >= 0
  ); //filter stations based on the search query

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
      <div>
        <Popup stations={stations}>
          <h1>Travelling somewhere?</h1>

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
          <h2>Stations</h2>
          <input
            type="text"
            value={filter}
            onChange={handleFilterChange}
            placeholder="Search"
          />
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
        </Popup>
      </div>
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
