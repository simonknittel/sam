# Code Guidelines

## General

- Do not do optimization too early. Example: An abstraction can decrease duplicated code. Suggest this abstraction only if it removes many duplicated lines, or if it removes a coupling that is not obvious. Such a coupling causes related changes in more than one location.
- Obey the usual conventions and the default configurations. Do not make a new solution for a problem that has a known solution.
- Use Conventional Commits if there is no different instruction.
- Divide a large set of changes into smaller commits. Each commit alone does not have to work. But each commit must be one logical step of the implementation. Example: A change has a database part, a backend part, a frontend part, and end-to-end (E2E) tests. Then make 4 commits, one commit for each part. This division into database, backend, frontend, and tests is only an example. Select the division that is best for the changes. The app does not have to work after each commit. But the app must work after the last commit.
- If a refactoring or a migration makes a change better, do the refactoring or the migration. Do not collect workarounds or technical debt. I want correct solutions, simplifications, unifications, and generalizations. I do not want workarounds or hacks. Do not build on weak foundations.

## Security

- Use `timingSafeEqual()` to compare secrets.
- Make sure that attackers cannot use loops for denial-of-service attacks. Example: A Zod schema that does validation of an array must have a `max(...)` limit.
- Do not write security-sensitive data or Personally Identifiable Information (PII) to the logs.
- When you do a redirect, make sure that user input cannot cause a redirect to an unwanted location (an open-redirect vulnerability).
- Prevent Server-Side Request Forgery (SSRF) when you use user input in a server-side `fetch()` request or an equivalent request.
- When you add a new dependency (an npm package, a Docker image, or an equivalent item), use the latest stable version that is 7 days old or older. If the latest stable release is less than 7 days old, use the most recent stable version that is 7 days old or older. Obey the same 7-day rule when you upgrade a dependency.
- Always set a fixed version for each dependency. For an npm package, use the full SemVer version (example: `1.2.3`, not `1`, `^1.2.3`, or `latest`). For a Docker image, use a digest pin, not a tag, when possible.
- Obey all other applicable security best practices.

## Reliability

- Always do validation of input from third-party sources (example: the response of an API). Use Zod or an equivalent tool.
- Always configure a timeout for `fetch()` calls (use `signal: AbortSignal.timeout(5000)`). If you do not set a timeout intentionally, add a comment that gives the reason.
- Make each new environment variable optional at runtime, if possible. If the variable is not set, use a good default value, or disable the related feature.
- If the project has tracing, suggest custom spans for new code where they are useful (examples: async/await code, large loops).
- Write tests that primarily examine end-to-end behavior. Add unit tests only for critical or complex logic. Do not add tests only to increase the code coverage. When possible, write E2E tests or integration tests, not unit tests.
- When you write E2E tests, tell the user about possible errors in the app. Do not write a workaround in the test to hide an app error.
- Use `encodeURI()` and `decodeURI()`, or better `new URL()`, when you make URLs. Do not use string concatenation.
- Obey all other applicable reliability best practices.

## Next.js / React

- Define the type of the props with an explicit TypeScript interface. Make each property `readonly`.

  Example:

  ```tsx
  interface Props {
    readonly children: string;
  }

  export const HeadingComponent = ({ children }: Props) => {
    return <h1>{children}</h1>;
  };
  ```

- Do not make components too large. Divide them into smaller components that you can use again. Usually, move a component that you use in a loop into a separate component.
- If a component property is a union of string literals, use a TypeScript `enum`.

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

- You must use `clsx` to combine CSS classes. Do not use string concatenation, ternary operators, or equivalent constructions.
- For mutations, use server actions, not API endpoints, when possible.
- Obey all other applicable Next.js and React best practices.

## TypeScript

- A switch statement that does an exhaustive check must have a default case that throws an error. Use the `never` type to make sure that the switch statement includes all cases.

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

- Use enums, not union types of string literals.
- Obey all other applicable TypeScript best practices.

## Database design / Prisma ORM Client

- Use a timestamp, not a simple boolean, when possible.
- Add the columns `created_by`, `created_at`, `updated_by`, `updated_at`, `deleted_by`, and `deleted_at` if possible.
- Add an `id` column to each table. Do this also when a combination of two columns could be a unique identifier for the table.
- Always import the TypeScript types for Prisma schema models from the generated Prisma client. Do not define these types again.
- Obey all other applicable database-design best practices.

## Visual design / CSS / UI / UX / accessibility

- Each interactive element must have a hover state, a focus state, and an active state.
- If an element truncates text (example: with `text-overflow: ellipsis`), add a `title` attribute to the element. The `title` attribute shows the full text on hover.
- Disable all animations and transitions when `prefers-reduced-motion` is set in the user's browser.
- Obey all other applicable best practices for visual design, CSS, UI/UX, and accessibility.

## Code style

- Do not use a variable name or a function name that has only one character.
- Do not use abbreviations.
- Obey all other applicable code-style best practices.

## Documentation

- Do not write unnecessary comments. Code must be clear without comments. Use comments to explain intentions that are not immediately clear.
  - Example: Do not write a comment such as: `myString.split(",") // Splits the string into an array using , as delimiter`
- Document magic numbers.
- Do not use abbreviations.
- Do not write the same information in two locations. If the information is in one document, do not write it again in a different location. Add a link to the initial location.
- When you write the description for a Merge Request or a Pull Request, do not include details that the code comments already give.
- Use ASD-STE100 Simplified Technical English for documentation and comments.
- Obey all other applicable documentation best practices.
