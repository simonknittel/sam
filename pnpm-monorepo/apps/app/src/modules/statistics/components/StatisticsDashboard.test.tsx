import type { Session } from "next-auth";
import { generateKeyPairSync } from "node:crypto";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

const NOT_CONFIGURED_TEXT =
  "Die Statistiken sind in dieser Umgebung nicht eingerichtet.";

const SESSION = {
  user: { id: "clhaw95yi0000jr08ybuvy137" },
  entity: { id: "clog1zezo04isul0nfes57hmo", handle: "ind3x" },
  givenPermissionSets: [],
} as unknown as Session;

const generateBase64EncodedPrivateKeyPem = () => {
  const { privateKey } = generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });
  const pem = privateKey.export({ format: "pem", type: "pkcs8" }) as string;

  return Buffer.from(pem).toString("base64");
};

/**
 * The Playwright stack has one environment for all tests, thus these states
 * of the environment are tested here. The modules read the environment
 * through `@/env` and keep the signing key in memory, thus each case gets
 * its own module graph.
 */
const renderDashboard = async (environment: {
  readonly STATISTICS_GRAFANA_URL?: string;
  readonly EMBED_JWT_PRIVATE_KEY?: string;
}) => {
  vi.resetModules();
  vi.doMock("server-only", () => ({}));
  vi.doMock("@/env", () => ({
    env: { NEXT_PUBLIC_BASE_URL: "https://sam.example.com", ...environment },
  }));
  vi.doMock("@/modules/logging", () => ({
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  }));

  const { resolveStatisticsDashboard } =
    await import("../utils/resolveStatisticsDashboard");
  const { StatisticsDashboard } = await import("./StatisticsDashboard");

  return renderToStaticMarkup(
    <StatisticsDashboard
      dashboard={await resolveStatisticsDashboard(SESSION)}
    />,
  );
};

describe("statistics dashboard", () => {
  test("shows a note without a Grafana URL", async () => {
    const html = await renderDashboard({
      EMBED_JWT_PRIVATE_KEY: generateBase64EncodedPrivateKeyPem(),
    });

    expect(html).toContain(NOT_CONFIGURED_TEXT);
  });

  test("shows a note without a signing key", async () => {
    const html = await renderDashboard({
      STATISTICS_GRAFANA_URL: "http://127.0.0.1:3100",
    });

    expect(html).toContain(NOT_CONFIGURED_TEXT);
  });
});
