import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Game from "../app/page";
import gameStyles from "../app/globals.css?raw";

const style = document.createElement("style");
style.dataset.ohanaMart = "game-styles";
style.textContent = gameStyles;
document.head.append(style);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Game />
  </StrictMode>,
);
