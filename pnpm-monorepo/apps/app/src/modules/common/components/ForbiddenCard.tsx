import { Hero } from "./Hero";

/**
 * Inline "Redacted" card for a `forbidden.tsx` boundary that sits inside
 * chrome the layout keeps around it — the counterpart of `NotFoundCard`.
 */
export const ForbiddenCard = () => {
  return (
    <article className="bg-secondary rounded-primary p-8 flex flex-col items-center gap-4">
      <Hero text="Redacted" size="md" withGlitch />

      <p>Du bist nicht berechtigt dies zu sehen.</p>
    </article>
  );
};
