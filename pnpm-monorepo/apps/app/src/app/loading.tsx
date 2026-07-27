/**
 * Empty `loading.tsx` at the root in order to get an instant transition when navigating
 * between pages. This only works when prefetching on `<Link>` is enabled/set to default.
 *
 * If you don't add the `loading.tsx`, prefetching will still work but will fetch the actual
 * page instead which way have requests to the database and therefore may incur costly
 * database requests.
 *
 * You can still add custom `loading.tsx` files for individual pages to override this one.
 */
export default function Loading() {
  return null;
}
