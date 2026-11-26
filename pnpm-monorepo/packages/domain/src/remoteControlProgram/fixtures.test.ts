import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  getOldestLogAnalyzerEntryVersion,
  toLogAnalyzerEntryType,
} from "../logAnalyzer/logAnalyzerEntries.js";
import {
  containsIpAddress,
  IP_ADDRESS_MARKER,
  IP_ADDRESS_PATTERN_SOURCES,
  IP_ADDRESS_REPLACEMENT,
  IP_ADDRESS_REPLACEMENT_PASSES,
  replaceIpAddresses,
} from "./ipAddressMarker.js";
import { createLogEntryHash } from "./logEntryHash.js";

/**
 * The shared test data of the TypeScript and the Rust implementations, in the
 * root of the repository (see its `README.md`). The tests compare with it and
 * never write it.
 */
const FIXTURES = join(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "..",
  "..",
  "remote-control-program-fixtures",
);

const readJson = async <Value>(path: string) =>
  JSON.parse(
    await readFile(join(FIXTURES, path), { encoding: "utf8" }),
  ) as Value;

interface IpRule {
  readonly marker: string;
  readonly patterns: readonly {
    readonly name: string;
    readonly source: string;
  }[];
  readonly passes_per_pattern: number;
  readonly replacement: { readonly javascript: string };
}

interface IpCase {
  readonly description: string;
  readonly input: string;
  readonly output: string;
  readonly input_contains_ip_address: boolean;
  readonly output_contains_ip_address: boolean;
}

interface HashCase {
  readonly description: string;
  readonly type: string;
  readonly oldest_type: string;
  readonly raw_line_with_marker: string;
  readonly hash: string;
}

const ipRule = await readJson<IpRule>("ip-address-marker/rule.json");
const { cases: ipCases } = await readJson<{
  readonly cases: readonly IpCase[];
}>("ip-address-marker/cases.json");
const { cases: hashCases } = await readJson<{
  readonly cases: readonly HashCase[];
}>("log-entry-hash/cases.json");

/**
 * Applies `rule.json` like a different engine, as its `README.md` tells. Thus
 * the shared test data alone gives the expected results.
 */
const applyIpRuleOfSharedTestData = (line: string) => {
  let result = line;
  for (const { source } of ipRule.patterns) {
    const regex = new RegExp(source, "g");
    for (let pass = 0; pass < ipRule.passes_per_pattern; pass += 1) {
      result = result.replace(regex, ipRule.replacement.javascript);
    }
  }
  return result;
};

describe("the IP rule", () => {
  /** The rule is immutable data, see `ipAddressMarker.ts` */
  test("is the rule of the shared test data", () => {
    expect({
      marker: IP_ADDRESS_MARKER,
      sources: IP_ADDRESS_PATTERN_SOURCES,
      passes: IP_ADDRESS_REPLACEMENT_PASSES,
      replacement: IP_ADDRESS_REPLACEMENT,
    }).toEqual({
      marker: ipRule.marker,
      sources: ipRule.patterns.map(({ source }) => source),
      passes: ipRule.passes_per_pattern,
      replacement: ipRule.replacement.javascript,
    });
  });

  test.each(ipCases)(
    "$description",
    ({
      input,
      output,
      input_contains_ip_address,
      output_contains_ip_address,
    }) => {
      expect(replaceIpAddresses(input)).toBe(output);
      expect(applyIpRuleOfSharedTestData(input)).toBe(output);
      expect(containsIpAddress(input)).toBe(input_contains_ip_address);
      expect(containsIpAddress(output)).toBe(output_contains_ip_address);
    },
  );
});

describe("createLogEntryHash", () => {
  test.each(hashCases)(
    "$description",
    async ({ type, oldest_type, raw_line_with_marker, hash }) => {
      const entryType = toLogAnalyzerEntryType(type);
      if (!entryType) throw new Error(`Unknown type ${type}`);

      expect(getOldestLogAnalyzerEntryVersion(entryType)).toBe(oldest_type);
      await expect(
        createLogEntryHash(entryType, raw_line_with_marker),
      ).resolves.toBe(hash);
    },
  );
});
