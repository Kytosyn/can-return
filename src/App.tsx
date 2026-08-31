import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { useAppStore } from "./store";

export default function App() {
  const initDb = useAppStore((s) => s.initDb);

  useEffect(() => {
    initDb().catch(console.error);
  }, [initDb]);

  return <RouterProvider router={router} />;
}
