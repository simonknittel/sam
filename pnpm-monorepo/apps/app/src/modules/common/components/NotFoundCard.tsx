import { Hero } from "./Hero";

/**
 * Inline "404" card for a `not-found.tsx` boundary. The layout of the segment
 * keeps its chrome around this card, for example a sidebar, a heading or a tab
 * navigation. Routes without such chrome use the full-page boundary at `/app`.
 */
export const NotFoundCard = () => {
  return (
    <article className="flex flex-col items-center gap-4 rounded-primary bg-secondary p-8">
      <Hero text="404" size="md" withGlitch />

      <p>Page not found</p>
    </article>
  );
};
