import type { ApplicationErrorTexts } from "@/modules/application";
import { FleetCatalogErrorMessage } from "@sam-monorepo/application";

/**
 * The texts of the create and the update actions of the catalog for the
 * names that exist already, and for the links and the wiki page of a variant
 */
export const FLEET_ERROR_TEXTS = {
  [FleetCatalogErrorMessage.ManufacturerNameTaken]:
    "Ein Hersteller mit diesem Namen existiert bereits.",
  [FleetCatalogErrorMessage.SeriesNameTaken]:
    "Eine Serie mit diesem Namen existiert bereits.",
  [FleetCatalogErrorMessage.VariantNameTaken]:
    "Eine Variante mit diesem Namen existiert in dieser Serie bereits.",
  [FleetCatalogErrorMessage.DuplicateLinkService]:
    "Jeder Dienst kann nur einen Link haben.",
  [FleetCatalogErrorMessage.WikiPageNotReadable]:
    "Die Wiki-Seite existiert nicht mehr oder ist für dich nicht sichtbar.",
  [FleetCatalogErrorMessage.VariantWikiPageLinked]:
    "Die Variante hat bereits eine Wiki-Seite. Die Seite ist jetzt aktuell.",
} satisfies ApplicationErrorTexts;

/**
 * The texts of the delete actions of the catalog when a different user
 * deleted the item first
 */
export const FLEET_DELETE_ERROR_TEXTS = {
  [FleetCatalogErrorMessage.ManufacturerNotFound]:
    "Der Hersteller ist bereits gelöscht.",
  [FleetCatalogErrorMessage.SeriesNotFound]: "Die Serie ist bereits gelöscht.",
  [FleetCatalogErrorMessage.VariantNotFound]:
    "Die Variante ist bereits gelöscht.",
} satisfies ApplicationErrorTexts;
