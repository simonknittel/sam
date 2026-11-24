/**
 * Integrated and external apps have separate slug namespaces which can
 * collide, so a key is only unique together with its namespace. The database
 * stores the key of a favorite: a changed slug loses the favorites.
 */
export enum AppKeyNamespace {
  Integrated = "integrated",
  External = "external",
}

/** Long enough for any slug we could reasonably give an app */
export const MAXIMUM_APP_KEY_LENGTH = 128;

/** A namespace, a colon and the slug of the app, for example `integrated:dashboard` */
export const APP_KEY_PATTERN = new RegExp(
  `^(${AppKeyNamespace.Integrated}|${AppKeyNamespace.External}):[a-zA-Z0-9-]+$`,
);
