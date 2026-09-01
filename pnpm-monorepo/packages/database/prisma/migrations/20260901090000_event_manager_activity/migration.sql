-- Manager assignments and removals get their own activity types so the event
-- activity feed shows who changed the managers of an event.

-- AlterEnum
ALTER TYPE "EventActivityType" ADD VALUE 'MANAGER_ADDED';
ALTER TYPE "EventActivityType" ADD VALUE 'MANAGER_REMOVED';
