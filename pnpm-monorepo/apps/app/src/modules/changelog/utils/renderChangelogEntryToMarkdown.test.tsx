import type { ReactNode } from "react";
import { expect, test } from "vitest";
import { renderChangelogEntryToMarkdown } from "./renderChangelogEntryToMarkdown";

interface StaticImageData {
  readonly src: string;
  readonly width: number;
  readonly height: number;
}

/**
 * In the layer of the React Server Components, a client component is a
 * reference that the server cannot call
 */
const createClientReference = <Props,>(name: string) =>
  Object.assign(
    ((): never => {
      throw new Error(`The server called the client component ${name}`);
    }) as (props: Props) => never,
    { $$typeof: Symbol.for("react.client.reference") },
  );

const Link = createClientReference<{
  readonly href: string;
  readonly className?: string;
  readonly children: ReactNode;
}>("Link");

const Image = createClientReference<{
  readonly src: StaticImageData;
  readonly alt: string;
}>("Image");

interface ScreenshotProps {
  readonly src: StaticImageData;
  readonly alt: string;
}

const Screenshot = ({ src, alt }: ScreenshotProps) => (
  <Image src={src} alt={alt} />
);

test("renders the body as Markdown with absolute URLs", async () => {
  const markdown = await renderChangelogEntryToMarkdown(
    {
      body: () => (
        <>
          <p>
            Unter{" "}
            <Link href="/app/iam/settings" className="text-interaction-500">
              IAM &gt; Einstellungen
            </Link>{" "}
            legst du <strong>jetzt</strong> die Rollen fest.
          </p>

          <ul>
            <li>
              <Link href="/app/events?status=open">Events</Link>
            </li>
            <li>
              <Link href="https://example.com/docs">Extern</Link>
            </li>
          </ul>

          <Link href="/app/events">
            <Screenshot
              src={{
                src: "/_next/static/media/events.1a2b3c.png",
                width: 480,
                height: 320,
              }}
              alt="Die Event-Liste"
            />
          </Link>
        </>
      ),
    },
    new URL("https://sam.example.com"),
  );

  expect(markdown).toBe(
    [
      "Unter [IAM > Einstellungen](https://sam.example.com/app/iam/settings) legst du **jetzt** die Rollen fest.",
      "",
      "* [Events](https://sam.example.com/app/events?status=open)",
      "* [Extern](https://example.com/docs)",
      "",
      "[![Die Event-Liste](https://sam.example.com/_next/static/media/events.1a2b3c.png)](https://sam.example.com/app/events)",
    ].join("\n"),
  );
});
