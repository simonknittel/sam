/**
 * The limits of the tag forms of the app. The use cases use the same values.
 */

/** The tag row of the role picker shows the full name */
export const ROLE_TAG_NAME_MAXIMUM_LENGTH = 32;

/** The longest plain-text description of a tag. It is a tooltip. */
export const ROLE_TAG_DESCRIPTION_MAXIMUM_LENGTH = 500;

/**
 * The maximum number of ids in each add or remove list of the links between
 * roles and tags. A tag has much fewer roles, and a role much fewer tags.
 * The limit keeps the writes bounded.
 */
export const ROLE_TAG_ASSIGNMENT_CHANGES_MAXIMUM = 250;
