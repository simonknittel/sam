import { describe, expect, test } from "vitest";
import {
  redactEmailAddress,
  redactEmailAddressesInJson,
} from "./emailRedaction.js";

describe("redactEmailAddress", () => {
  test.each([
    ["hallo@simonknittel.de", "h***o@s***l.de"],
    ["first.last+tag@mail.example.co.uk", "f***g@m***o.uk"],
    ["ab@cd.com", "a***@c***.com"],
    ["a@b.io", "a***@b***.io"],
    ["jürgen@müller.de", "j***n@m***r.de"],
    ["user@localhost", "u***r@l***t"],
    ["no-address", "n***s"],
  ])("%s gives %s", (emailAddress, redacted) => {
    expect(redactEmailAddress(emailAddress)).toBe(redacted);
  });
});

describe("redactEmailAddressesInJson", () => {
  test("redacts the addresses in all strings, also in a JSON-encoded string, and keeps the other values", () => {
    expect(
      redactEmailAddressesInJson({
        userId: "clhaw95yi0000jr08ybuvy137",
        userEmail: "hallo@simonknittel.de",
        count: 3,
        enabled: null,
        nested: [{ text: "Mail an hallo@simonknittel.de oder ab@cd.com." }],
        legacy: '{"email":"hallo@simonknittel.de"}',
      }),
    ).toEqual({
      userId: "clhaw95yi0000jr08ybuvy137",
      userEmail: "h***o@s***l.de",
      count: 3,
      enabled: null,
      nested: [{ text: "Mail an h***o@s***l.de oder a***@c***.com." }],
      legacy: '{"email":"h***o@s***l.de"}',
    });
  });
});
