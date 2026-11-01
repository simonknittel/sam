"use client";

import dynamic from "next/dynamic";
import { Suspense, type ComponentProps } from "react";

/**
 * Only an admin gets the toolbar. Thus its code (for example Headless UI and
 * Fuse.js of the user search) is a separate chunk, which the pages of all
 * other users do not load. The server renders the toolbar, thus the chunk
 * loads together with the page and the toolbar shows immediately.
 */
const AdminToolbarClient = dynamic(() =>
  import("./AdminToolbarClient").then((mod) => mod.AdminToolbarClient),
);

type Props = ComponentProps<typeof AdminToolbarClient>;

export const AdminToolbarLoader = (props: Props) => {
  return (
    /**
     * The container is outside of the boundary, thus it hydrates together
     * with the layout. An open Base UI popup puts `data-base-ui-inert` on
     * each child of the body. If a child of the body hydrates after a popup
     * opened (for example the inbox on page load), React reports a hydration
     * mismatch.
     */
    <div className="fixed top-2 left-1/2 z-50 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 gap-2">
      {/* Without this boundary, the chunk makes the closest parent boundary
          wait. That is possibly the full layout. */}
      <Suspense>
        <AdminToolbarClient {...props} />
      </Suspense>
    </div>
  );
};
