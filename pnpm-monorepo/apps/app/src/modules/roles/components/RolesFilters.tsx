import { MultiSelectComboboxFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/MultiSelectComboboxFilter";
import { SingleSelectComboboxFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/SingleSelectComboboxFilter";
import { TextSearchFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/TextSearchFilter";
import type { ManagedRoleTag } from "@sam-monorepo/application";

interface Props {
  /** All tags */
  readonly tags: readonly Pick<ManagedRoleTag, "id" | "name">[];
}

export const RolesFilters = ({ tags }: Props) => {
  return (
    <>
      <TextSearchFilter label="Name" />

      <SingleSelectComboboxFilter
        name="filter"
        label="Filter"
        items={[
          { value: "all", label: "Alle" },
          { value: "has-inheritance", label: "Vererbungen" },
          { value: "has-level", label: "Level" },
          { value: "has-citizen", label: "Citizen" },
          { value: "no-citizen", label: "Keine Citizen" },
        ]}
      />

      <MultiSelectComboboxFilter
        name="tags"
        label="Tags"
        items={tags.map((tag) => ({ value: tag.id, label: tag.name }))}
      />

      <SingleSelectComboboxFilter
        name="sort"
        label="Sortierung"
        items={[
          { value: "name-asc", label: "Name A - Z" },
          { value: "name-desc", label: "Name Z - A" },
          { value: "inherits-desc", label: "Anzahl Vererbungen ↓" },
          { value: "inherits-asc", label: "Anzahl Vererbungen ↑" },
          { value: "citizen-desc", label: "Anzahl Citizen ↓" },
          { value: "citizen-asc", label: "Anzahl Citizen ↑" },
        ]}
      />
    </>
  );
};
