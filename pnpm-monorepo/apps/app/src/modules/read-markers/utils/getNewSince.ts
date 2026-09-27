/**
 * The creation date after which an item can be new for the viewer: the later
 * of the start of the tracking of its subject type and the email
 * confirmation of the viewer (the join date, like for the changelog). A
 * viewer without a confirmation date (an admin who bypassed it) has no join
 * cutoff.
 */
export const getNewSince = (trackedSince: Date, emailVerified: Date | null) =>
  emailVerified && emailVerified > trackedSince ? emailVerified : trackedSince;
