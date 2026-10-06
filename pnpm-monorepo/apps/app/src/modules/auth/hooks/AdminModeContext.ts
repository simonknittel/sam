import { createContext } from "react";

/**
 * Whether the admin mode applies, with the same result as
 * `isAdminModeActive` on the server. The layout of `/app` computes it for each
 * request. Thus the server render and the browser give the same permissions,
 * and no browser code reads the admin mode cookie.
 */
export const AdminModeContext = createContext(false);
