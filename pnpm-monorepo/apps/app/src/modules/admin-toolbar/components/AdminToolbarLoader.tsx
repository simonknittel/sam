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
     * Without this boundary, the chunk makes the closest parent boundary
     * wait. That is possibly the full layout.
     */
    <Suspense>
      <AdminToolbarClient {...props} />
    </Suspense>
  );
};
