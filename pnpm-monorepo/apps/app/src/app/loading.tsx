/**
 * Empty `loading.tsx` at the root in order to get an instant transition when navigating
 * between pages. It also acts as the boundary the hover prefetch of the common `<Link>`
 * component stops at: without it, a prefetch would render the actual target page,
 * including its potentially costly database requests.
 *
 * You can still add custom `loading.tsx` files for individual pages to override this one.
 */
export default function Loading() {
  return null;
}
