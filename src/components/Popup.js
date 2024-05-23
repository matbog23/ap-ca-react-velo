import React, { useState } from "react";
import popupStyles from "@/styles/Popup.module.css";

const Popup = (props) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={[
        popupStyles.popup,
        hovered ? popupStyles["popup-visible"] : "",
      ].join(" ")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={popupStyles["popup-content"]}>{props.children}</div>
    </div>
  );
};

export default Popup;
