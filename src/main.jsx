import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { ActivitiesPage } from "./pages/ActivitiesPage";
import { ActivityDetailPage } from "./pages/ActivityDetailPage";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/kegiatan" element={<ActivitiesPage />} />
        <Route path="/kegiatan/:slug" element={<ActivityDetailPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
