import { env } from "@/env";
import { type MetadataRoute } from "next";
import faviconSrc from "../assets/favicon.svg";
import screenshotAppsMobileSrc from "../assets/screenshots/screenshot-apps-mobile.avif";
import screenshotAppsSrc from "../assets/screenshots/screenshot-apps.avif";
import screenshotDashboardMobileSrc from "../assets/screenshots/screenshot-dashboard-mobile.avif";
import screenshotDashboardSrc from "../assets/screenshots/screenshot-dashboard.avif";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SAM - Sinister Incorporated",
    short_name: "SAM",
    description:
      "Sinister Administration Module (SAM) for the Star Citizen organization Sinister Incorporated",
    categories: ["entertainment", "games"], // https://github.com/w3c/manifest/wiki/Categories
    scope: env.BASE_URL, // Will open links outside the app in the browser
    start_url: `${env.BASE_URL}/app`,
    shortcuts: [
      // Can't be individualized based on permissions
      {
        name: "Dashboard",
        url: "/app",
      },
      {
        name: "Spynet",
        url: "/app/spynet",
      },
      {
        name: "Flotte",
        url: "/app/fleet",
      },
    ],
    display: "standalone",
    background_color: "#000",
    theme_color: "#000",
    icons: [
      {
        src: faviconSrc.src,
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
    screenshots: [
      {
        form_factor: "wide",
        src: screenshotDashboardSrc.src,
        sizes: "1280x719",
        type: "image/avif",
      },
      {
        form_factor: "narrow",
        src: screenshotDashboardMobileSrc.src,
        sizes: "509x1280",
        type: "image/avif",
      },
      {
        form_factor: "wide",
        src: screenshotAppsSrc.src,
        sizes: "1280x1077",
        type: "image/avif",
      },
      {
        form_factor: "narrow",
        src: screenshotAppsMobileSrc.src,
        sizes: "509x1280",
        type: "image/avif",
      },
    ],
  };
}
