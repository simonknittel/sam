import { describe, expect, test } from "vitest";
import { IP_ADDRESS_MARKER, replaceIpAddresses } from "./ipAddressMarker.js";

/**
 * The cases of the shared test data are in `fixtures.test.ts`. This file
 * tests the passes.
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

/** Keys before the addresses. The `d` of `id:` is a hexadecimal digit. */
const KEYS = ["", "addr:", "id:", "[3]:"];

describe("replaceIpAddresses", () => {
  /** One match cannot use the separator as its end and the next match as its start */
  test.each([" ", ",", ";", "/", "|", "=", "(", '"', "\r\n"])(
    "replaces each address, also after a key, when only %j separates the addresses",
    (separator) => {
      expect(replaceIpAddresses(ADDRESSES.join(separator))).toBe(
        ADDRESSES.map(() => IP_ADDRESS_MARKER).join(separator),
      );

      const keyOf = (index: number) => KEYS[index % KEYS.length];
      expect(
        replaceIpAddresses(
          ADDRESSES.map((address, index) => `${keyOf(index)}${address}`).join(
            separator,
          ),
        ),
      ).toBe(
        ADDRESSES.map(
          (_address, index) => `${keyOf(index)}${IP_ADDRESS_MARKER}`,
        ).join(separator),
      );
    },
  );
});
