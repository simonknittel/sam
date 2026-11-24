/**
 * Gives an instant transition between pages. It is also the boundary that stops
 * the hover prefetch of the common `<Link>` component: without it, a prefetch
 * would render the target page with its database requests.
 */
export default function Loading() {
  return null;
}
