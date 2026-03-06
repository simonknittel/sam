import { Suspense } from "react";
import { MobileActionBarClient } from "./MobileActionBarClient";

export const MobileActionBarLoader = () => {
  return (
    <nav className="lg:hidden fixed z-40 left-0 right-0 bottom-0 h-16 shadow-sm bg-neutral-800">
      <Suspense>
        <MobileActionBarClient />
      </Suspense>
    </nav>
  );
};
