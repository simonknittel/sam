/**
 * The rule that removes the IP addresses from a raw log line before the line
 * leaves the machine (decision 22 of `docs/remote-control-program/README.md`).
 * The log file connector applies it before the upload, the relay refuses a
 * line in which `containsIpAddress` finds an address, and the M3 migration
 * applies it once to the stored lines.
 *
 * The rule is immutable data, like the patterns of the Log Analyzer: the hash
 * of an entry contains the line with the marker (see `logEntryHash.ts`). Do
 * not change the marker, the expressions, their order, the replacement or the
 * number of passes. A different rule is a new version with new names, and the
 * old version stays. The shared test data in
 * `remote-control-program-fixtures/ip-address-marker/` contains the same
 * values, and its cases show the decisions below.
 *
 * One definition for three engines: JavaScript, PostgreSQL (`regexp_replace`
 * of the M3 migration) and Rust (the `regex` crate, which has no lookahead and
 * no lookbehind). Thus the expressions have no lookaround and no `\d`, `\w` or
 * `\b` (their meaning is different in the engines), only ASCII classes. The
 * engines apply the rule like this:
 *
 * 1. Replace all matches of the IPv6 expression, two times.
 * 2. Replace all matches of the IPv4 expression, two times.
 *
 * - Each replacement replaces all matches: the flag `g` in JavaScript and
 *   PostgreSQL, `replace_all` in Rust. No other flag: the classes contain both
 *   cases, and without the multiline flag, `^` and `$` are the start and the
 *   end of the whole raw line, also when the raw line contains two log lines.
 * - The replacement puts the boundary characters (groups 1 and 2) back around
 *   the marker. JavaScript: `$1IP_REDACTED$2`, PostgreSQL:
 *   `\1IP_REDACTED\2`, Rust: `${1}IP_REDACTED${2}`.
 * - Two passes: an engine cannot use one character for two matches. In
 *   `192.0.2.1 192.0.2.2`, the first match uses the space as its end, thus the
 *   second address has no start in the same pass. A match cannot start in the
 *   middle of an address of its kind, thus the first pass skips an address
 *   only when the match directly before it replaced the address before it.
 *   The second pass replaces all skipped addresses.
 * - IPv6 first: the IPv4 expression can start after a `:` (see below), thus it
 *   could replace only the IPv4 part of an IPv6 address such as
 *   `::ffff:192.0.2.1`.
 *
 * A match starts and ends at a boundary character, thus it contains the full
 * address. At one position, two matches are possible only with a port (the
 * IPv4 address with the port, or without the port and with the `:` as the end)
 * or with brackets at the start of the line (the bracket form, or the address
 * in the brackets). JavaScript and Rust take the first alternative that
 * matches, and the alternatives are in an order in which this is also the
 * longest match, which PostgreSQL takes. Thus the engines give the same
 * result. A one-time comparison of JavaScript and PostgreSQL 18 on 20,000
 * random lines and on the shared cases found no difference.
 *
 * Decisions:
 *
 * - IPv4: four numbers from 0 to 255, also with leading zeros
 *   (`010.000.002.001`). A number above 255 or a fifth number stops the
 *   match, thus the version `4.4.159.9873` and `1.2.3.4.5` stay.
 * - A version with four numbers from 0 to 255 (for example `1.3.0.0`) looks
 *   like an IPv4 address. The rule replaces it. This removes only information,
 *   it does not show data.
 * - The start of an address: the start of the line, or a character that is
 *   not a letter, a digit, `_` or `.`. Thus `v1.2.3.4` (a part of a name) and
 *   `10.4.0.1.9` (a part of a longer number) stay. Before an IPv4 address, a
 *   `:` is permitted (`ipv4:192.0.2.1:443`). Before an IPv6 address, a `:` is
 *   not permitted, thus the match cannot start in the middle of an address.
 * - The end of an address: the end of the line, or a character that is not a
 *   letter, a digit, `_` or `.`. After an IPv4 address, this includes a `:`
 *   (`192.0.2.1: refused`, `192.0.2.1:198.51.100.2`). After an IPv6 address, a
 *   `:` can continue the address, thus a `:` is permitted only like a `.`. A
 *   `.` directly after the address is permitted at the end of the line, or
 *   when a character follows that is not a letter, a digit or `_`: the end of
 *   a sentence (`192.0.2.1.`), an ellipsis (`192.0.2.1...`) or a text
 *   (`2001:db8::1: refused`).
 * - A port is a part of the address: a `:` and digits after an IPv4 address,
 *   after an IPv6 address in brackets (`[2001:db8::1]:443`) and after an IPv6
 *   address without brackets (`2001:db8::1:64090`, some programs write it).
 *   An IPv6 address in brackets without a port keeps the brackets
 *   (`address[IP_REDACTED]`), like the tag `address[…]` of the game. When a
 *   different address is directly before the bracket form, with only one
 *   character between them, the first pass replaces only the address in the
 *   brackets, and the brackets and the port stay (`[IP_REDACTED]:443`).
 * - IPv6: all text forms of RFC 4291 (eight groups, the `::` compression, the
 *   last 32 bits as an IPv4 address, for example `::ffff:192.0.2.1`), with the
 *   hexadecimal digits in both cases. A zone stays after the marker
 *   (`IP_REDACTED%eth0`), and a prefix length stays after it
 *   (`IP_REDACTED/32`).
 * - The address `::` alone stays. It is also the scope operator of C++ and a
 *   separator in a text, and it identifies nobody.
 * - C++ names (`CEntity::OnSpawn`) stay, because a letter is directly before
 *   the `::`. A name of which each part has a maximum of four letters from A
 *   to F (for example `[Bad::Face]`) is a valid IPv6 address. The rule
 *   replaces it. No name of the patterns has this form.
 * - Times (`12:34:56.789`), dates, GUIDs, hexadecimal ids
 *   (`0x00007FFE2CE13CFA`), MAC addresses (six groups) and decimal numbers with
 *   two or three parts (prices, coordinates) are not addresses. They stay.
 * - No pattern captures an IP address in a named group, thus each line still
 *   matches its pattern with the same groups after the replacement.
 */

/** Fixed ASCII text without digits and without white space */
export const IP_ADDRESS_MARKER = "IP_REDACTED";

/** One number of an IPv4 address: 0 to 255, also with leading zeros */
const OCTET = "(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])";
const IPV4 = `(?:${OCTET}\\.){3}${OCTET}`;
/** One group of an IPv6 address */
const HEXTET = "[0-9A-Fa-f]{1,4}";

/**
 * The text forms of RFC 4291 with at least one group. Each `::` comes from the
 * `:` at the end of a left group and the `:` at the start of a right group.
 */
const IPV6_FORMS = [
  /** Eight groups */
  `(?:${HEXTET}:){7}${HEXTET}`,
  /** One to seven groups, then `::` */
  `(?:${HEXTET}:){1,7}:`,
  /** Groups on the two sides of `::`, a maximum of seven groups */
  `(?:${HEXTET}:){1,6}:${HEXTET}`,
  `(?:${HEXTET}:){1,5}(?::${HEXTET}){1,2}`,
  `(?:${HEXTET}:){1,4}(?::${HEXTET}){1,3}`,
  `(?:${HEXTET}:){1,3}(?::${HEXTET}){1,4}`,
  `(?:${HEXTET}:){1,2}(?::${HEXTET}){1,5}`,
  `${HEXTET}:(?::${HEXTET}){1,6}`,
  /** `::`, then one to seven groups */
  `:(?::${HEXTET}){1,7}`,
  /** The last 32 bits as an IPv4 address: six groups without `::` */
  `(?:${HEXTET}:){6}${IPV4}`,
  /** The last 32 bits as an IPv4 address, a maximum of five groups */
  `(?:${HEXTET}:){1,5}:${IPV4}`,
  `(?:${HEXTET}:){1,4}:${HEXTET}:${IPV4}`,
  `(?:${HEXTET}:){1,3}(?::${HEXTET}){1,2}:${IPV4}`,
  `(?:${HEXTET}:){1,2}(?::${HEXTET}){1,3}:${IPV4}`,
  `${HEXTET}:(?::${HEXTET}){1,4}:${IPV4}`,
  `:(?::${HEXTET}){0,5}:${IPV4}`,
];
const IPV6 = `(?:${IPV6_FORMS.join("|")})`;

const PORT = ":[0-9]+";

/**
 * The source of the IPv6 expression (see the comment at the top of this
 * file). Group 1 is the character before the address, group 2 the characters
 * after it. The bracket form is the first alternative: at the start of the
 * line, it is the longer match.
 */
export const IPV6_ADDRESS_PATTERN_SOURCE = `(^|[^0-9A-Za-z_.:])(?:\\[${IPV6}\\]${PORT}|${IPV6}(?:${PORT})?)([^0-9A-Za-z_.:]|[.:][^0-9A-Za-z_]|[.:]?$)`;

/**
 * The source of the IPv4 expression (see the comment at the top of this
 * file). Group 1 is the character before the address, group 2 the characters
 * after it.
 */
export const IPV4_ADDRESS_PATTERN_SOURCE = `(^|[^0-9A-Za-z_.])${IPV4}(?:${PORT})?([^0-9A-Za-z_.]|\\.[^0-9A-Za-z_]|\\.?$)`;

/** The expressions in the order of their application */
export const IP_ADDRESS_PATTERN_SOURCES = [
  IPV6_ADDRESS_PATTERN_SOURCE,
  IPV4_ADDRESS_PATTERN_SOURCE,
] as const;

/**
 * The replacement for the two expressions, in the syntax of JavaScript (see
 * the top of this file for PostgreSQL and Rust)
 */
export const IP_ADDRESS_REPLACEMENT = `$1${IP_ADDRESS_MARKER}$2`;

/** The passes of each expression, see the top of this file */
export const IP_ADDRESS_REPLACEMENT_PASSES = 2;

/**
 * Global, thus `replace` replaces all matches. `replace` sets `lastIndex` to 0
 * before and after its run, thus the calls can share the expressions.
 */
const REPLACEMENT_REGEXES = IP_ADDRESS_PATTERN_SOURCES.map(
  (source) => new RegExp(source, "g"),
);

/** Not global, thus `test` keeps no state between two calls */
const SEARCH_REGEXES = IP_ADDRESS_PATTERN_SOURCES.map(
  (source) => new RegExp(source),
);

/** Replaces each IP address of a raw log line with `IP_ADDRESS_MARKER`. */
export const replaceIpAddresses = (rawLine: string) => {
  let line = rawLine;
  for (const regex of REPLACEMENT_REGEXES) {
    for (let pass = 0; pass < IP_ADDRESS_REPLACEMENT_PASSES; pass += 1) {
      line = line.replace(regex, IP_ADDRESS_REPLACEMENT);
    }
  }
  return line;
};

/**
 * True when the line contains an IP address that `replaceIpAddresses` would
 * replace. The relay refuses such a line.
 */
export const containsIpAddress = (line: string) =>
  SEARCH_REGEXES.some((regex) => regex.test(line));
