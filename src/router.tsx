import { createBrowserRouter } from "react-router-dom";
import { Layout } from "./components/ui/Layout";
import { ScanPage } from "./pages/ScanPage";
import { NearbyPage } from "./pages/NearbyPage";
import { SettingsPage } from "./pages/SettingsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <ScanPage /> },
      { path: "nearby", element: <NearbyPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);
