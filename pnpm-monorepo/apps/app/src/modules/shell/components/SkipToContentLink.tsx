import { Button2 } from "@/modules/common/components/Button2";
import { MAIN_CONTENT_ID } from "@/modules/common/components/layouts/MainContent";

/**
 * Lets keyboard users jump past both the top bar and the app's own navigation.
 * It has to be rendered before them so it is the first thing a tab press
 * reaches.
 *
 * It is parked above the viewport instead of being `sr-only` because sighted
 * keyboard users need to see it once it takes focus.
 */
export const SkipToContentLink = () => {
  return (
    <Button2
      as="a"
      href={`#${MAIN_CONTENT_ID}`}
      className="fixed -top-full left-2 z-50 focus:top-2"
    >
      Zum Inhalt springen
    </Button2>
  );
};
