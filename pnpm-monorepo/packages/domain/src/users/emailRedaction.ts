/**
 * Takes the place of the hidden characters. The mask has a fixed length, thus
 * it does not tell the length of the address.
 */
const MASK = "***";

/**
 * An email address in a text. It is simpler than RFC 5322, but it finds the
 * usual addresses, also with letters that are not ASCII. A dot at the end of
 * a sentence is not a part of the address.
 */
const EMAIL_ADDRESS_PATTERN =
  /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/gu;

/**
 * Keeps the first and the last character. A part of one or two characters
 * keeps only its first character.
 */
const redactPart = (part: string) => {
  const characters = Array.from(part);
  if (characters.length === 0) return part;
  if (characters.length <= 2) return `${characters[0]}${MASK}`;

  return `${characters[0]}${MASK}${characters.at(-1)}`;
};

/**
 * Hides the most part of an email address. A person who knows the full
 * address can still compare it: the first and the last character of the local
 * part and of the domain name stay, and the top-level domain stays.
 *
 * Example: `hallo@simonknittel.de` gives `h***o@s***l.de`.
 */
export const redactEmailAddress = (emailAddress: string) => {
  const atIndex = emailAddress.lastIndexOf("@");
  if (atIndex === -1) return redactPart(emailAddress);

  const localPart = emailAddress.slice(0, atIndex);
  const domain = emailAddress.slice(atIndex + 1);
  const dotIndex = domain.lastIndexOf(".");
  const redactedDomain =
    dotIndex === -1
      ? redactPart(domain)
      : `${redactPart(domain.slice(0, dotIndex))}${domain.slice(dotIndex)}`;

  return `${redactPart(localPart)}@${redactedDomain}`;
};

/**
 * Redacts each email address in each string of a JSON value (see
 * `redactEmailAddress()`), also in a JSON-encoded string.
 */
export const redactEmailAddressesInJson = (value: unknown): unknown => {
  if (typeof value === "string")
    return value.replaceAll(EMAIL_ADDRESS_PATTERN, redactEmailAddress);

  if (Array.isArray(value)) return value.map(redactEmailAddressesInJson);

  if (value !== null && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        redactEmailAddressesInJson(entry),
      ]),
    );

  return value;
};
