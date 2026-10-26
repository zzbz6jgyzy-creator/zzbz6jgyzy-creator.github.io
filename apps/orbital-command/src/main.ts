import "./styles.css";
import { OrbitalApp } from "./ui/app";

const root = document.getElementById("oc-app");
if (root) {
  const app = new OrbitalApp(root);
  void app.start().catch((err) => {
    const live = document.querySelector("[data-live]");
    if (live) live.textContent = "Orbital Command failed to start. The 2D directory below remains available.";
    console.warn(err);
  });
}
