import {
  wikiContainerColumns,
  WikiScopeKind,
  type EventContainer,
} from "@sam-monorepo/domain";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ForbiddenError } from "../errors.js";
import { findReadableWikiScope, type WikiScopeTarget } from "./wikiScope.js";

export interface WikiScopeTag {
  readonly id: string;
  readonly name: string;
}

/** A variant embeds the global wiki, thus it shows the global tags */
const getTagContainer = async (
  context: ApplicationContext,
  actor: Actor,
  target: WikiScopeTarget,
): Promise<EventContainer | null> => {
  switch (target.kind) {
    case WikiScopeKind.Wiki:
    case WikiScopeKind.Variant:
      return null;

    case WikiScopeKind.Briefing: {
      const scope = await findReadableWikiScope(context, actor, target);
      if (!scope) throw new ForbiddenError("Missing event wiki permission");

      return target.container;
    }

    default:
      throw new Error(`Unknown wiki scope: ${target satisfies never}`);
  }
};

/**
 * A tag is not filtered by the visibility of its pages: one naming for the
 * tags of a scope is more important than hiding the name of a tag that only
 * invisible pages use. The tag pages filter their pages themselves. The global
 * wiki has no gate and needs no scope. A briefing uses the gate of the
 * briefing layout.
 */
export const findWikiScopeTags = async (
  context: ApplicationContext,
  actor: Actor,
  target: WikiScopeTarget,
): Promise<WikiScopeTag[]> => {
  const container = await getTagContainer(context, actor, target);

  return context.prisma.wikiTag.findMany({
    where: wikiContainerColumns(container),
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
};
