import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";

const Chikorita = lazy(() => import("./pages/Chikorita"));
const Freebee = lazy(() => import("./pages/Freebee"));
const LiturgicalCalendar = lazy(() => import("./pages/LiturgicalCalendar"));
const ShareLocation = lazy(() => import("./pages/ShareLocation"));

export default function App() {
  return (
    <Suspense fallback={<div className="p-4 text-center">Loading...</div>}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/share-location/*" element={<ShareLocation />} />
        <Route path="/share-location" element={<ShareLocation />} />
        <Route path="/chikorita/*" element={<Chikorita />} />
        <Route path="/chikorita" element={<Chikorita />} />
        <Route path="/freebee/*" element={<Freebee />} />
        <Route path="/freebee" element={<Freebee />} />
        <Route path="/liturgical_calendar/*" element={<LiturgicalCalendar />} />
        <Route path="/liturgical_calendar" element={<LiturgicalCalendar />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </Suspense>
  );
}
