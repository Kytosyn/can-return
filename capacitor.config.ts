import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "sg.canreturn.app",
  appName: "Can Return?",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  plugins: {
    Geolocation: {
      // Permissions are requested just-in-time in the app UI
    },
  },
};

export default config;
