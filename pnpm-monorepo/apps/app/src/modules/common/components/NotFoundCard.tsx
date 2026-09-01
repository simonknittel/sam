import { Hero } from "./Hero";

/**
 * Inline "404" card for a `not-found.tsx` boundary that sits inside chrome —
 * a sidebar, a heading, a tab navigation — which the layout keeps around it.
 * Routes without such chrome use the full-page boundary at `/app` instead.
 */
export const NotFoundCard = () => {
  return (
    <article className="bg-secondary rounded-primary p-8 flex flex-col items-center gap-4">
      <Hero text="404" size="md" withGlitch />

      <p>Page not found</p>
    </article>
  );
};
