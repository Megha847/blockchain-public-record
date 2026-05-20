import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { io } from "socket.io-client";
import App from "./App";
import "./style.css";

export const socket = io(import.meta.env.VITE_WS_URL || "http://localhost:5000");

ReactDOM.createRoot(document.getElementById("app")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: "#0f172a", color: "#e2e8f0", border: "1px solid rgba(148,163,184,0.35)" },
          success: { iconTheme: { primary: "#22c55e", secondary: "#0f172a" } },
          error: { iconTheme: { primary: "#f87171", secondary: "#0f172a" } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
