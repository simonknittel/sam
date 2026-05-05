# Coding Guidelines

## General

- When reviewing code, don't list any positive things. Only list things which need fixing.
- When you think a change may causes issues, go and check that. For example: when a function signature changes, go and find all references to this function and check if they got adapted accordingly.
- When suggesting changes, don't prematurely optimize. For example: if a abstraction to reduce code duplication is possible, only suggest it if actually saves significant amount of code or improves maintainability.

## Security

- Suggest use of `timingSafeEqual()` for comparing secrets.
- Check if loops could be exploited for denial of service attacks. For example: Zod schema validating arrays should have a `max(...)` limit.
- Don't output anything security sensitive or Personally Identifiable Information (PII) to logs
- When redirecting, make sure user input can't redirect to some unexpected place (open redirect vulnerability)
- Avoid Server-side request forgery (SSRF) when using user input in a server-side `fetch()` request or similar
- When adding any kind of new dependencies (npm package, Docker image, etc.), make sure to use the latest stable version available. Fetch the corresponding registries when necessary.
- Use fixed version for dependencies (use digests if possible)
- Look out for any other security-related best practices.

## Reliability

- Input from third party sources (e.g. response of an API) always need to get validated with Zod or similar
- `fetch()` calls should always have a timeout configured (using `signal: AbortSignal.timeout(5000)`). If the timeout was omitted on purpose, a comment describing the reasoning should get added.
- When a new environment variable gets introduced, if possible, it should be optional during runtime. If the variable is missing, either a good default value should be used or the respective feature should get disabled.
- If the project has tracing implemented, suggest custom spans for new code if it makes sense (e.g. async/await or big loops).
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

- Look out for any other TypeScript-related best practices.

## Database design

- Prefer using a timestamp over a simple boolean
- Add `created_by`, `created_at`, `updated_by`, `updated_at`, `deleted_by` and `deleted_at` if possible
- Add an id column to tables which even could work only using a combination of two columns as unique identifier
- Look out for any other database design-related best practices.

## Visual design / CSS / UI / UX / accessibility

- Interactive elements should always have a hover, focus, and active state.
- Look out for any other visual design, CSS, UI/UX and accessibility-related best practices.

## Code style

- No single character variable or function names
- Don't use abbreviations
- Don't write unnecessary comments, code should be readable on it's own. Use them to explain intentions which may not be recognizable on first view
  - Example: Don't write comments like: `myString.split(",") // Splits the string into an array using , as delimiter`
- DocumentMagic Numbers
- Always use `encodeURI()` and `decodeURI()` or preferably `new URL()`
- Always integrate dependencies (npm packages, Docker images, etc.) with a fixed version number (full SemVer, e.g. `1.2.3` instead of `1`, `^1.2.3` or `latest`)
  - Don't use outdated versions. Always check at the respective package registry (e.g. <https://www.npmjs.com/>) what the latest version of a dependency is and use that.
- Look out for any other style-related best practices.
