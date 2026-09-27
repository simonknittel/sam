import { prisma } from "@/db";

/**
 * Takes the transaction lock of the wiki page tree. The trigger
 * `WikiPage_check_parent` takes the same lock when a page gets a new parent.
 * Put this statement first in each transaction that changes the tree (a move
 * or a new sort order of siblings): when the lock comes only from the trigger
 * after the first sibling updates, two moves can wait for each other.
 */
export const lockWikiPageTree = () =>
  prisma.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('WikiPage_hierarchy'))`;
