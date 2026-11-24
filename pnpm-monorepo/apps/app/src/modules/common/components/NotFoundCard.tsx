import { Hero } from "./Hero";

/**
 * For a `not-found.tsx` boundary of a segment whose layout has its own chrome,
 * for example a sidebar. Routes without such chrome use the full-page boundary
 * at `/app`.
 */
export const NotFoundCard = () => {
  return (
    <article className="flex flex-col items-center gap-4 rounded-primary bg-secondary p-8">
      <Hero text="404" size="md" withGlitch />

      <p>Page not found</p>
    </article>
  );
};
