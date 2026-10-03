import { Hero } from "./Hero";

/**
 * Inline "Redacted" card for a `forbidden.tsx` boundary. This card is the
 * counterpart of `NotFoundCard` and has the same layout.
 */
export const ForbiddenCard = () => {
  return (
    <article className="flex flex-col items-center gap-4 rounded-primary bg-secondary p-8">
      <Hero text="Redacted" size="md" withGlitch />

      <p>Du bist nicht berechtigt dies zu sehen.</p>
    </article>
  );
};
