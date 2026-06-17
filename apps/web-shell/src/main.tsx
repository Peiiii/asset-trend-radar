import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app";
import { AppErrorBoundary } from "./app-error-boundary";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);
