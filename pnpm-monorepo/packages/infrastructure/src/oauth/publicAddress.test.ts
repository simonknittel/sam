import { promisify } from "node:util";
import { describe, expect, test } from "vitest";
import {
  createValidatingLookup,
  isLoopbackAddress,
  isPublicAddress,
} from "./publicAddress.js";

describe("isPublicAddress", () => {
  test("accepts public addresses", () => {
    for (const address of ["1.1.1.1", "8.8.8.8", "2606:4700:4700::1111"])
      expect(isPublicAddress(address), address).toBe(true);
  });

  test("refuses addresses that are not public", () => {
    for (const address of [
      "0.0.0.0",
      "10.1.2.3",
      "100.64.0.1",
      "127.0.0.1",
      "169.254.169.254",
      "172.16.0.1",
      "192.168.1.1",
      "224.0.0.1",
      "255.255.255.255",
      "::",
      "::1",
      "::ffff:127.0.0.1",
      "::ffff:10.0.0.1",
      "64:ff9b::a00:1",
      "fc00::1",
      "fd12:3456::1",
      "fe80::1",
      "ff02::1",
      "2002:a00:1::",
      "not an address",
    ])
      expect(isPublicAddress(address), address).toBe(false);
  });

  test("knows the loopback addresses", () => {
    expect(isLoopbackAddress("127.0.0.1")).toBe(true);
    expect(isLoopbackAddress("127.1.2.3")).toBe(true);
    expect(isLoopbackAddress("::1")).toBe(true);
    expect(isLoopbackAddress("10.0.0.1")).toBe(false);
  });
});

describe("createValidatingLookup", () => {
  test("refuses a hostname that resolves to a loopback address", async () => {
    const lookup = promisify(createValidatingLookup(isPublicAddress));

    await expect(lookup("localhost", {})).rejects.toThrow(
      "does not resolve to a permitted address",
    );
  });

  test("resolves a hostname with permitted addresses", async () => {
    const lookup = promisify(createValidatingLookup(isLoopbackAddress));

    await expect(lookup("localhost", { all: true })).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ address: expect.any(String) as string }),
      ]),
    );
  });
});
