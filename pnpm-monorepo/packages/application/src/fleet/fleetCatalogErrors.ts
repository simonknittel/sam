/**
 * The messages of the typed errors of the fleet catalog: the manufacturers,
 * the series and the variants. They are the members of an enum, thus the app
 * can show its own text for each of them.
 */
export enum FleetCatalogErrorMessage {
  /** A `NotFoundError` */
  ManufacturerNotFound = "The manufacturer does not exist",
  /** A `ValidationError`: the name of a manufacturer is unique */
  ManufacturerNameTaken = "A manufacturer with this name exists already",
  /** A `NotFoundError` */
  SeriesNotFound = "The series does not exist",
  /**
   * A `ValidationError`: the name of a series is unique over all
   * manufacturers
   */
  SeriesNameTaken = "A series with this name exists already",
  /** A `NotFoundError` */
  VariantNotFound = "The variant does not exist",
  /** A `ValidationError`: the name of a variant is unique in its series */
  VariantNameTaken = "A variant of the series with this name exists already",
  /** A `ValidationError`: a variant has at most one link for each service */
  DuplicateLinkService = "Two links have the same service",
  /**
   * A `ValidationError`: one answer for an unknown page, a page in the trash
   * and a page that the actor cannot read, thus the existence of a page
   * never leaks
   */
  WikiPageNotReadable = "The wiki page does not exist or the actor cannot read it",
  /**
   * A `ConflictError`: a different user linked a wiki page to the variant
   * after the page showed the variant without a link
   */
  VariantWikiPageLinked = "The variant has a linked wiki page already",
}
