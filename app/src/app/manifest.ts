import { env } from "@/env";
import { type MetadataRoute } from "next";
import faviconSrc from "../assets/favicon.svg";
import screenshotDashboardMobileSrc from "../assets/screenshots/screenshot-dashboard-mobile.png";
import screenshotDashboardSrc from "../assets/screenshots/screenshot-dashboard.png";
import screenshotSpynetCitizenMobileSrc from "../assets/screenshots/screenshot-spynet-citizen-mobile.png";
import screenshotSpynetCitizenSrc from "../assets/screenshots/screenshot-spynet-citizen.png";
import screenshotSpynetMobileSrc from "../assets/screenshots/screenshot-spynet-mobile.png";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "S.A.M. - Sinister Incorporated",
    short_name: "S.A.M.",
    description:
      "Sinister Administration Module (S.A.M.) for the Star Citizen organization Sinister Incorporated",
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
        sizes: "1280x709",
        type: "image/png",
      },
      {
        form_factor: "wide",
        src: screenshotSpynetCitizenSrc.src,
        sizes: "1280x709",
        type: "image/png",
      },
      {
        form_factor: "narrow",
        src: screenshotSpynetCitizenMobileSrc.src,
        sizes: "577x1280",
        type: "image/png",
      },
      {
        form_factor: "narrow",
        src: screenshotSpynetMobileSrc.src,
        sizes: "577x1280",
        type: "image/png",
      },
      {
        form_factor: "narrow",
        src: screenshotDashboardMobileSrc.src,
        sizes: "577x1280",
        type: "image/png",
      },
    ],
  };
}
