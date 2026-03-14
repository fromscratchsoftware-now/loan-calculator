
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import { DatabaseSync } from "./app/utils/databaseSync";

// Start DB Sync before react loads
DatabaseSync.hookLocalStorage();
DatabaseSync.initialize().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
  