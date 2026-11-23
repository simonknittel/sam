import { describe, expect, test } from "vitest";
import {
  IP_ADDRESS_MARKER,
  IP_ADDRESS_PATTERN_SOURCES,
  IP_ADDRESS_REPLACEMENT,
  IP_ADDRESS_REPLACEMENT_PASSES,
  replaceIpAddresses,
} from "./ipAddressMarker.js";

/**
 * The cases of the shared test data are in `fixtures.test.ts`. This file
 * tests what an engine does with the exported definition, and the passes.
 */

/** Each text form, also with an IPv4 part and with a port */
const ADDRESSES = [
  "192.0.2.1",
  "198.51.100.2:64090",
  "2001:db8::8a2e:370:7334",
  "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
  "::ffff:198.51.100.7",
  "2001:db8:1:2:3:4:192.0.2.34",
  "2001:db8::1:64090",
  "203.0.113.9",
];

describe("replaceIpAddresses", () => {
  test("gives the result of the exported expressions and replacement", () => {
    const line =
      'remoteAddr=198.51.100.23:64090 localAddr=0.0.0.0:64090 address[2001:db8::200e] peer=ipv6:[2001:db8::43]:443 "::ffff:192.0.2.1" v1.2.3.4 CEntity::OnSpawn';

    let expected = line;
    for (const source of IP_ADDRESS_PATTERN_SOURCES) {
      const regex = new RegExp(source, "g");
      for (let pass = 0; pass < IP_ADDRESS_REPLACEMENT_PASSES; pass += 1) {
        expected = expected.replace(regex, IP_ADDRESS_REPLACEMENT);
      }
    }

    expect(replaceIpAddresses(line)).toBe(expected);
    expect(expected).toBe(
      'remoteAddr=IP_REDACTED localAddr=IP_REDACTED address[IP_REDACTED] peer=ipv6:[IP_REDACTED]:443 "IP_REDACTED" v1.2.3.4 CEntity::OnSpawn',
    );
  });

  /** One match cannot use the separator as its end and the next match as its start */
  test.each([" ", ",", ";", "/", "|", "=", "(", '"', "\r\n"])(
    "replaces each address when only %j separates the addresses",
    (separator) => {
      expect(replaceIpAddresses(ADDRESSES.join(separator))).toBe(
        ADDRESSES.map(() => IP_ADDRESS_MARKER).join(separator),
      );
    },
  );
});
