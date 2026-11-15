import { createHash } from "node:crypto";
import { expect, test } from "../fixtures/test";

/**
 * The app takes the URLs in the files from NEXT_PUBLIC_BASE_URL, which the
 * build inlines. The workers of the stack listen on other ports. Thus the
 * tests request the path of each URL from the worker.
 */
const pathOf = (url: string) => new URL(url).pathname;

const sha256 = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");

interface ClaudeMarketplace {
  readonly name: string;
  readonly plugins: readonly {
    readonly name: string;
    readonly source: {
      readonly source: string;
      readonly url: string;
      readonly sha256: string;
    };
  }[];
}

interface SkillDiscoveryIndex {
  readonly skills: readonly {
    readonly name: string;
    readonly type: string;
    readonly url: string;
    readonly digest: string;
  }[];
}

test.describe("the files for AI agents", () => {
  test("the Claude marketplace is public and gives the digest of the plugin archive", async ({
    request,
  }) => {
    const marketplaceResponse = await request.get(
      "/api/ai-agents/claude/marketplace.json",
    );
    expect(marketplaceResponse.status()).toBe(200);
    const marketplace = (await marketplaceResponse.json()) as ClaudeMarketplace;
    expect(marketplace.name).toBe("sam");
    const [plugin] = marketplace.plugins;
    if (!plugin) throw new Error("The marketplace has no plugin");
    expect(plugin.source.source).toBe("archive");

    const archiveResponse = await request.get(pathOf(plugin.source.url));
    expect(archiveResponse.status()).toBe(200);
    expect(archiveResponse.headers()["content-type"]).toBe("application/zip");
    expect(sha256(await archiveResponse.body())).toBe(plugin.source.sha256);
  });

  test("the skill index is public and gives the digest of each skill archive", async ({
    request,
  }) => {
    const indexResponse = await request.get(
      "/.well-known/agent-skills/index.json",
    );
    expect(indexResponse.status()).toBe(200);
    const index = (await indexResponse.json()) as SkillDiscoveryIndex;
    expect(index.skills.map((entry) => entry.name)).toEqual([
      "sam-overview",
      "sam-permissions",
    ]);

    for (const entry of index.skills) {
      expect(entry.type).toBe("archive");
      const archiveResponse = await request.get(pathOf(entry.url));
      expect(archiveResponse.status()).toBe(200);
      expect(`sha256:${sha256(await archiveResponse.body())}`).toBe(
        entry.digest,
      );
    }
  });
});
