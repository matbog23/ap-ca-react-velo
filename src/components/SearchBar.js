// SearchBar.jsx

import React from "react";
import styles from "@/styles/SearchBar.module.css"; // Import the CSS module for the search bar

const SearchBar = ({ value, onChange }) => {
  return (
    <div className={styles["InputContainer"]}>
      <input
        className="Input"
        type="text"
        placeholder="Find Stations..."
        value={value}
        onChange={onChange}
      />
    </div>
  );
};

export default SearchBar;
