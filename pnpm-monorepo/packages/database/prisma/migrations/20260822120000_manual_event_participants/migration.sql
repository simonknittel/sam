-- Manager-driven participation changes get their own activity types so the
-- feed can tell them apart from the citizen's own sign-up and cancellation.

-- AlterEnum
ALTER TYPE "EventActivityType" ADD VALUE 'PARTICIPATION_ADDED_BY_MANAGER';
ALTER TYPE "EventActivityType" ADD VALUE 'PARTICIPATION_REMOVED_BY_MANAGER';
