import { ImageUpload } from "@/modules/common/components/ImageUpload";
import { Tile } from "@/modules/common/components/Tile";
import type { ManagedRoleTag } from "@sam-monorepo/application";
import clsx from "clsx";

interface Props {
  readonly tag: Pick<ManagedRoleTag, "id" | "icon">;
}

/** The icon upload of the role overview, for a tag */
export const RoleTagIconTile = ({ tag }: Props) => {
  return (
    <Tile heading="Icon">
      <ImageUpload
        resourceType="roleTag"
        resourceId={tag.id}
        resourceAttribute="iconId"
        imageId={tag.icon?.id}
        imageMimeType={tag.icon?.mimeType}
        width={128}
        height={128}
        className={clsx(
          "group size-32 rounded-secondary border border-neutral-700 text-neutral-500 transition-colors hover:border-neutral-500 hover:text-neutral-300",
          {
            "flex items-center justify-center after:content-['Bild_hochladen']":
              !tag.icon,
          },
        )}
        imageClassName="size-32"
        pendingClassName="size-32"
      />

      <p className="mt-1 text-sm text-neutral-500">nur 1:1</p>
    </Tile>
  );
};
