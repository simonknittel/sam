import {
  getApplicationContext,
  getOptionalRequestActor,
} from "@/modules/application";
import { findVariantBacklinks } from "@sam-monorepo/application";
import { VariantWithLogo } from "./VariantWithLogo";

interface Props {
  readonly pageId: string;
}

/**
 * The query matches the exact page id, never descendants. A viewer without the
 * fleet gate of the variant pages sees nothing.
 */
export const VariantWikiBacklinks = async ({ pageId }: Props) => {
  const actor = await getOptionalRequestActor();
  if (!actor) return null;

  const variants = await findVariantBacklinks(getApplicationContext(), actor, {
    pageId,
  });
  if (variants.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/40">
      <span className="font-mono uppercase">Eingebunden bei:</span>
      {variants.map((variant) => (
        <VariantWithLogo
          key={variant.id}
          variant={variant}
          manufacturer={variant.series.manufacturer}
          size={32}
          variantNameClassName="text-sm text-neutral-300"
        />
      ))}
    </div>
  );
};
