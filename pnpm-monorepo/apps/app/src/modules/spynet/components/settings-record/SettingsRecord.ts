/**
 * The shape shared by the spynet settings records (note types and
 * classification levels): plain name-only entities managed through the
 * same CRUD surface and REST endpoints.
 */
export interface SettingsRecord {
  readonly id: string;
  readonly name: string;
}
