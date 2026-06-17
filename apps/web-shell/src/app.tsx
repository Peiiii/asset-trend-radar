import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ChartWallPage } from "@/features/chart-wall/components/chart-wall-page";

export default function App(): JSX.Element {
  return (
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <Routes>
        <Route path="/" element={<Navigate to="/chart-wall" replace />} />
        <Route path="/chart-wall" element={<ChartWallPage />} />
        <Route path="/funds" element={<ChartWallPage />} />
        <Route path="/universe" element={<ChartWallPage />} />
        <Route path="/scanner" element={<ChartWallPage />} />
        <Route path="/watchlist" element={<ChartWallPage />} />
        <Route path="/tasks" element={<ChartWallPage />} />
        <Route path="/data-health" element={<ChartWallPage />} />
        <Route path="/assets/:assetId" element={<ChartWallPage />} />
        <Route path="*" element={<Navigate to="/chart-wall" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
