import { EditableInput } from "@/modules/common/components/form/EditableInput";
import { renameWikiPage } from "../actions/renameWikiPage";
import { WikiPageIconButton } from "./WikiPageIconButton";

interface Props {
  readonly pageId: string;
  readonly iconId: string | null;
  readonly title: string;
  readonly canChangeIcon: boolean;
  readonly canRename: boolean;
}

/**
 * The icon and the title of a wiki page. The title stays in one line and
 * ends with an ellipsis when it is too long.
 */
export const WikiPageHeading = ({
  pageId,
  iconId,
  title,
  canChangeIcon,
  canRename,
}: Props) => {
  return (
    <h1 className="flex min-w-0 items-center gap-2 text-2xl font-bold">
      <WikiPageIconButton
        pageId={pageId}
        iconId={iconId}
        canAdmin={canChangeIcon}
      />

      {canRename ? (
        <EditableInput
          rowId={pageId}
          columnName="title"
          initialValue={title}
          action={renameWikiPage}
          truncate
        />
      ) : (
        <span className="truncate" title={title}>
          {title}
        </span>
      )}
    </h1>
  );
};
