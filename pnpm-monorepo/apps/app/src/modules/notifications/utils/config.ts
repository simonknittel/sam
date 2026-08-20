export const ON_SITE_NOTIFICATIONS_PAGE_SIZE = 25;

/**
 * A notification counts as viewed (and gets marked read) once at least this
 * share of it has been visible in the list for the dwell time.
 */
export const READ_ON_VIEW_VISIBILITY_THRESHOLD = 0.5;

export const READ_ON_VIEW_DWELL_MILLISECONDS = 500;

/**
 * Viewed notifications are collected and marked read in batches to avoid one
 * server action per row while scrolling.
 */
export const READ_ON_VIEW_FLUSH_DEBOUNCE_MILLISECONDS = 1_000;
