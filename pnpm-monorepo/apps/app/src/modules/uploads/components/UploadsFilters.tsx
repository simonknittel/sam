import { DateRangeFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/DateRangeFilter";
import { MultiSelectComboboxFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/MultiSelectComboboxFilter";
import { TextSearchFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/TextSearchFilter";
import {
  UPLOAD_AUTHOR_PARAM,
  UPLOAD_FROM_PARAM,
  UPLOAD_QUERY_PARAM,
  UPLOAD_TO_PARAM,
  UPLOAD_USAGE_PARAM,
} from "../utils/uploadFilterParams";
import {
  UPLOAD_USAGE_TYPE_LABELS,
  UploadUsageType,
} from "../utils/uploadUsage";

interface Author {
  readonly id: string;
  readonly name: string | null;
}

interface Props {
  /** Empty without `upload;manage`, which hides the author filter. */
  readonly authors: readonly Author[];
}

export const UploadsFilters = ({ authors }: Props) => {
  const usageItems = Object.values(UploadUsageType).map((usage) => ({
    value: usage,
    label: UPLOAD_USAGE_TYPE_LABELS[usage],
  }));

  const authorItems = authors.map((author) => ({
    value: author.id,
    label: author.name ?? author.id,
  }));

  return (
    <>
      <TextSearchFilter
        name={UPLOAD_QUERY_PARAM}
        label="DATEINAME"
        resetCursorPagination
      />

      <DateRangeFilter
        fromName={UPLOAD_FROM_PARAM}
        toName={UPLOAD_TO_PARAM}
        label="HOCHGELADEN"
        resetCursorPagination
      />

      <MultiSelectComboboxFilter
        name={UPLOAD_USAGE_PARAM}
        label="VERWENDUNG"
        items={usageItems}
        placeholder="Alle"
        resetCursorPagination
      />

      {authorItems.length > 0 && (
        <MultiSelectComboboxFilter
          name={UPLOAD_AUTHOR_PARAM}
          label="HOCHGELADEN VON"
          items={authorItems}
          placeholder="Alle"
          resetCursorPagination
        />
      )}
    </>
  );
};
