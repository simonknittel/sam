import type { TableOfContentsItem } from "@/modules/common/components/layouts/SidebarLayout/TableOfContents";

/**
 * For the settings page of an event and the "Stammdaten" page of a template.
 * The id is the fragment of the link.
 */
export const SETTINGS_SECTIONS = {
  masterData: { id: "stammdaten", label: "Stammdaten" },
  visibility: { id: "sichtbarkeit", label: "Sichtbarkeit" },
  participation: { id: "teilnahme", label: "Teilnahme" },
  discord: { id: "discord", label: "Discord" },
  details: { id: "details", label: "Details" },
  actions: { id: "aktionen", label: "Aktionen" },
  dangerZone: { id: "danger-zone", label: "Danger Zone" },
} as const satisfies Record<string, TableOfContentsItem>;
