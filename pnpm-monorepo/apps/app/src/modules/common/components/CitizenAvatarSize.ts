/**
 * The size of the Discord avatar of a citizen link. Not in the client
 * component, thus a server component can read the values.
 */
export enum CitizenAvatarSize {
  /**
   * 1.25 em: it follows the size of the text and stays inside its line
   * height, thus no line gets taller
   */
  Text = "text",
  /** 24 pixels, for table cells and rows with a 32-pixel line */
  Row = "row",
  /** 32 pixels */
  List = "list",
  None = "none",
}
