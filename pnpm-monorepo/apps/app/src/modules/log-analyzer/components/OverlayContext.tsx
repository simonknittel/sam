"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface OverlayContext {
  isSupported: boolean;
  pipWindow: Window | null;
  requestPipWindow: () => Promise<void>;
  closePipWindow: () => void;
}

const OverlayContext = createContext<OverlayContext | undefined>(undefined);

interface Props {
  readonly children: ReactNode;
}

export function OverlayProvider({ children }: Props) {
  // Detect if the feature is available.
  const isSupported = "documentPictureInPicture" in window;

  // Expose pipWindow that is currently active
  const [pipWindow, setPipWindow] = useState<Window | null>(null);

  // Close pipWindow programmatically
  const closePipWindow = () => {
    if (pipWindow != null) {
      pipWindow.close();
      setPipWindow(null);
    }
  };

  // Open new pipWindow
  const requestPipWindow = async () => {
    // We don't want to allow multiple requests.
    if (pipWindow != null) return;

    // @ts-expect-error documentPictureInPicture is not yet part of TypeScript's DOM types
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const pip = (await window.documentPictureInPicture.requestWindow({
      disallowReturnToOpener: true,
      width: 352,
      height: 256,
    })) as Window;

    // Detect when window is closed by user
    pip.addEventListener("pagehide", () => {
      setPipWindow(null);
    });

    // It is important to copy all parent window styles. Otherwise, there would be no CSS available at all
    // https://developer.chrome.com/docs/web-platform/document-picture-in-picture/#copy-style-sheets-to-the-picture-in-picture-window
    [...document.styleSheets].forEach((styleSheet) => {
      try {
        const cssRules = [...styleSheet.cssRules]
          .map((rule) => rule.cssText)
          .join("");
        const style = document.createElement("style");

        style.textContent = cssRules;
        pip.document.head.appendChild(style);
      } catch (error) {
        console.error("Error copying stylesheet:", error);

        const link = document.createElement("link");
        if (styleSheet.href == null) return;

        link.rel = "stylesheet";
        link.type = styleSheet.type;
        link.media = styleSheet.media.toString();
        link.href = styleSheet.href;
        pip.document.head.appendChild(link);
      }
    });

    setPipWindow(pip);
  };

  const value = {
    isSupported,
    pipWindow,
    requestPipWindow,
    closePipWindow,
  };

  return <OverlayContext value={value}>{children}</OverlayContext>;
}

export function useOverlay() {
  const context = useContext(OverlayContext);
  if (!context) throw new Error("Provider missing!");
  return context;
}
