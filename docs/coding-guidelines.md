# Coding Guidelines

## General

- Avoid premature optimization. For example, if an abstraction could reduce code duplication, only suggest it if it eliminates significant lines of duplication or removes a non-obvious coupling that would otherwise require coordinated changes in multiple places.
- Stay close to conventions and defaults. Don't try to reinvent the wheel.
- Use conventional commits if not specified otherwise.
- When working on a larger set of changes, break it down into smaller commits. They don't need to work on their own, but each commit should be a logical step in the implementation. Example: If a change requires a database change, a backend change, a frontend change and E2E tests, break it down into 4 commits, one for each part. This split in database, backend, frontend and tests is only an example. Choose a split which makes most sense for the changes. It's not required that the app is in a working state after each commit, but it should be in a working state after the last commit.

## Security

- Use `timingSafeEqual()` for comparing secrets.
- Check if loops could be exploited for denial of service attacks. For example: Zod schema validating arrays should have a `max(...)` limit.
- Don't output anything security sensitive or Personally Identifiable Information (PII) to logs
- When redirecting, make sure user input can't redirect to some unexpected place (open redirect vulnerability)
- Avoid Server-side request forgery (SSRF) when using user input in a server-side `fetch()` request or similar
- When adding any kind of new dependencies (npm package, Docker image, etc.), use the latest stable version that was published at least 7 days ago. If the most recent stable release is newer than 7 days, use the most recent stable version that is at least 7 days old. The same 7-day rule applies when upgrading existing dependencies to a newer version.
- Always integrate dependencies with a fixed version: use full SemVer (e.g. `1.2.3` instead of `1`, `^1.2.3` or `latest`) for npm packages, and prefer a digest pin over a tag for Docker images.
- Look out for any other security-related best practices.

## Reliability

- Input from third party sources (e.g. response of an API) always need to get validated with Zod or similar
- `fetch()` calls should always have a timeout configured (using `signal: AbortSignal.timeout(5000)`). If the timeout was omitted on purpose, a comment describing the reasoning must be added.
- When a new environment variable gets introduced, if possible, it should be optional during runtime. If the variable is missing, either a good default value should be used or the respective feature should get disabled.
- If the project has tracing implemented, suggest custom spans for new code if it makes sense (e.g. async/await or big loops).
- Implement tests which primarily focus on end-to-end and behavior. Add unit tests only for critical or complex logic. Don't add tests just for the sake of increasing code coverage. Prefer tests higher up in the pyramid (e.g. end-to-end or integration tests) over unit tests.
- When implementing E2E tests, highlight potential actual app errors to the user instead of trying to implement a workaround for the test.
- Use `encodeURI()` and `decodeURI()` or preferably `new URL()` instead of string concatenation when handling URLs.
- Look out for any other reliability-related best practices.

## Next.js / React

- The type of props should be explicitly defined using TypeScript interfaces and always be `readonly`.

  Example:

  ```tsx
  interface Props {
    readonly children: string;
  }

  export const HeadingComponent = ({ children }: Props) => {
    return <h1>{children}</h1>;
  };
  ```

- Components shouldn't be too large. Split them into smaller, reusable components. A looped component should most of the time get split into a separate component.
- Component properties which are a union of string literals should use a TypeScript `enum` instead.

  Example:

  ```tsx
  enum HeadingSize {
    Small = "small",
    Medium = "medium",
    Large = "large",
  }

  interface Props {
    readonly children: string;
    readonly size: HeadingSize;
  }

  export const HeadingComponent = ({ children, size }: Props) => {
    return <h1 className={size}>{children}</h1>;
  };
  ```

- You must use `clsx` when combining CSS classes. Do not use string concatenation, ternary operators or similar.
- Prefer server actions for mutations over API endpoints when possible.
- Look out for any other Next.js and React-related best practices.

## TypeScript

- Switch statements which do exhaustive checks should have a default case which throws an error. Use the `never` type to ensure that all cases are handled.

  Example:

  ```ts
  enum Color {
    Red = "red",
    Green = "green",
    Blue = "blue",
  }

  const color = Color.Red as Color;

  switch (color) {
    case Color.Red:
      // handle red
      break;

    case Color.Green:
      // handle green
      break;

    case Color.Blue:
      // handle blue
      break;

    default:
      throw new Error(`Unknown color: ${color satisfies never}`);
  }
  ```

- Prefer enums over union types of string literals
- Look out for any other TypeScript-related best practices.

## Database design / Prisma ORM Client

- Prefer using a timestamp over a simple boolean
- Add `created_by`, `created_at`, `updated_by`, `updated_at`, `deleted_by` and `deleted_at` if possible
- Add an id column to tables which even could work only using a combination of two columns as unique identifier
- Always import TypeScript types for Prisma schema models from the generated Prisma client instead of redefining them
- Look out for any other database design-related best practices.

## Visual design / CSS / UI / UX / accessibility

- Interactive elements should always have a hover, focus, and active state.
- If an element truncates text (e.g. using `text-overflow: ellipsis`), the element should have a `title` attribute which shows the full text on hover.
- Any animation or transition should be disabled when the user's browser has `prefers-reduced-motion` enabled.
- Look out for any other visual design, CSS, UI/UX and accessibility-related best practices.

## Code style

- Do not use single character variable or function names
- Do not use abbreviations
- Look out for any other style-related best practices.

## Documentation

- Do not write unnecessary comments, code should be readable on it's own. Use them to explain intentions which may not be recognizable on first view
  - Example: Do not write comments like: `myString.split(",") // Splits the string into an array using , as delimiter`
- Document magic numbers
- Do not use abbreviations
- Don't repeat yourself in documentation. If a piece of information is already documented somewhere else, don't repeat it in another place. Instead, link to the original documentation.
- When writing descriptions for Merge Requests or Pull Requests, don't duplicate any detail which is already covered in code comments.
- Look out for any other documentation-related best practices.
