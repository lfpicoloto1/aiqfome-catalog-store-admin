import "@aiqfome-org/geraldo-ui/tokens.css";
import "@aiqfome-org/geraldo-ui";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
