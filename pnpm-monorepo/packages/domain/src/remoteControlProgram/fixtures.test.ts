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
  IP_ADDRESS_PATTERNS,
  IP_ADDRESS_REPLACEMENT,
  IP_ADDRESS_REPLACEMENT_FOR_RUST,
  IP_ADDRESS_REPLACEMENT_PASSES,
  replaceIpAddresses,
} from "./ipAddressMarker.js";
import { createLogEntryHash } from "./logEntryHash.js";
import { readLogFileHeader } from "./logFileHeader.js";
import { downMessageSchema, upMessageSchema } from "./protocol.js";

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
  readonly replacement: {
    readonly javascript: string;
    readonly rust: string;
  };
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

interface LogFileHeaderCase {
  readonly description: string;
  readonly lines: readonly string[];
  readonly game_environment: string | null;
  readonly game_build: string | null;
}

/** `log-file-header.json` of the export of the shared definitions */
interface LogFileHeaderRule {
  readonly line_count: number;
  readonly fields: readonly {
    readonly field: string;
    readonly source: string;
    readonly flags: string;
    readonly value_source: string;
    readonly maximum_value_length: number;
  }[];
}

const ipRule = await readJson<IpRule>("ip-address-marker/rule.json");
const { cases: ipCases } = await readJson<{
  readonly cases: readonly IpCase[];
}>("ip-address-marker/cases.json");
const { cases: hashCases } = await readJson<{
  readonly cases: readonly HashCase[];
}>("log-entry-hash/cases.json");
const { cases: logFileHeaderCases } = await readJson<{
  readonly cases: readonly LogFileHeaderCase[];
}>("log-file-header/cases.json");
const logFileHeaderRule = await readJson<LogFileHeaderRule>(
  "../remote-control-program-definitions/log-file-header.json",
);

enum MessageDirection {
  Up = "up",
  Down = "down",
}

interface ProtocolMessageCase {
  readonly description: string;
  readonly direction: MessageDirection;
  readonly valid: boolean;
  readonly message: unknown;
}

const { cases: protocolMessageCases } = await readJson<{
  readonly cases: readonly ProtocolMessageCase[];
}>("protocol-messages/cases.json");

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
  /**
   * The rule is immutable data, see `ipAddressMarker.ts`. The export of the
   * shared definitions comes from the same values.
   */
  test("is the rule of the shared test data", () => {
    expect({
      marker: IP_ADDRESS_MARKER,
      patterns: IP_ADDRESS_PATTERNS,
      passes: IP_ADDRESS_REPLACEMENT_PASSES,
      replacement: IP_ADDRESS_REPLACEMENT,
      replacementForRust: IP_ADDRESS_REPLACEMENT_FOR_RUST,
    }).toEqual({
      marker: ipRule.marker,
      patterns: ipRule.patterns,
      passes: ipRule.passes_per_pattern,
      replacement: ipRule.replacement.javascript,
      replacementForRust: ipRule.replacement.rust,
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

/**
 * Applies `log-file-header.json` of the export like a different engine, as
 * the `README.md` of the export tells. Thus the export alone gives the
 * expected results.
 */
const applyLogFileHeaderRuleOfExport = (lines: readonly string[]) =>
  Object.fromEntries(
    logFileHeaderRule.fields.map(
      ({ field, source, flags, value_source, maximum_value_length }) => {
        const value = lines
          .slice(0, logFileHeaderRule.line_count)
          .map((line) => line.replace(/\r$/, ""))
          .map((line) => new RegExp(source, flags).exec(line)?.groups?.value)
          .find(
            (candidate) =>
              candidate !== undefined &&
              candidate.length <= maximum_value_length &&
              new RegExp(value_source).test(candidate),
          );

        return [field, value ?? null];
      },
    ),
  );

describe("readLogFileHeader", () => {
  test.each(logFileHeaderCases)(
    "$description",
    ({ lines, game_environment, game_build }) => {
      expect(readLogFileHeader(lines.join("\n"))).toEqual({
        gameEnvironment: game_environment,
        gameBuild: game_build,
      });
      expect(applyLogFileHeaderRuleOfExport(lines)).toEqual({
        game_environment,
        game_build,
      });
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

describe("the protocol messages", () => {
  test.each(protocolMessageCases)(
    "$direction: $description",
    ({ direction, valid, message }) => {
      const schema =
        direction === MessageDirection.Up ? upMessageSchema : downMessageSchema;

      expect(schema.safeParse(message).success).toBe(valid);
    },
  );
});
