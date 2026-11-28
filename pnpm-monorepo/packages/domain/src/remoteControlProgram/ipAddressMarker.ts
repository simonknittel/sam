/**
 * The rule that removes the IP addresses from a raw log line before the line
 * leaves the machine (decision 22 of `docs/remote-control-program/README.md`).
 * The log file connector applies it before the upload, the relay refuses a
 * line in which `containsIpAddress` finds an address, and the migration
 * `log_analyzer_entry_ip_marker` applied it once to the stored lines.
 *
 * The rule is immutable data, like the patterns of the Log Analyzer: the hash
 * of an entry contains the line with the marker (see `logEntryHash.ts`). Do
 * not change the marker, the expressions, their order, the replacement or the
 * number of passes. A different rule is a new version with new names, and the
 * old version stays. The export of the shared definitions contains the rule
 * for the desktop companion. The shared test data in
 * `remote-control-program-fixtures/ip-address-marker/` contains the same
 * values, and its cases show the decisions below.
 *
 * One definition for three engines: JavaScript, PostgreSQL (`regexp_replace`
 * of the migration `log_analyzer_entry_ip_marker`) and Rust (the `regex`
 * crate, which has no lookahead and no lookbehind). Thus the expressions have
 * no lookaround and no `\d`, `\w` or `\b` (their meaning is different in the
 * engines), only ASCII classes. The engines apply the rule like this:
 *
 * 1. Replace all matches of the IPv6 expression, two times.
 * 2. Replace all matches of the IPv4 expression, two times.
 *
 * - Each replacement replaces all matches: the flag `g` in JavaScript and
 *   PostgreSQL, `replace_all` in Rust. No other flag: the classes contain both
 *   cases, and without the multiline flag, `^` and `$` are the start and the
 *   end of the whole raw line, also when the raw line contains two log lines.
 * - The replacement puts the text before and after the address (groups 1 and
 *   2) back around the marker. JavaScript: `$1IP_REDACTED$2`, PostgreSQL:
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
 * A match starts at the start of the line, at a boundary character or at a
 * key before the address, and it ends at a boundary character, thus it
 * contains the full address. The alternatives of the start exclude each
 * other: at one position, only one of them can give a match. At one position,
 * two matches are possible only with a port (the IPv4 address with the port,
 * or without the port and with the `:` as the end) or with brackets at the
 * start of the line (the bracket form, or the address in the brackets).
 * JavaScript and Rust take the first alternative that matches, and the
 * alternatives are in an order in which this is also the longest match, which
 * PostgreSQL takes. Thus the engines give the same result. A one-time
 * comparison of JavaScript and PostgreSQL 18 on 110,000 random lines (also
 * with keys) and on the shared cases found no difference.
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
 *   `:` is permitted (`ipv4:192.0.2.1:443`).
 * - Before an IPv6 address, a `:` can be a part of the address. Thus a `:`
 *   directly before an IPv6 address is permitted only after text that cannot
 *   be a part of an address: the start of the line or a character that is not
 *   a letter, a digit, `_`, `.` or `:` (`[3]:`), a key with a letter from G
 *   to Z or `_` (`addr:`, `id:`, `ipv6:`, `remote_addr:`), a key of five or
 *   more hexadecimal digits (`10512345:`), an IPv4 address with a port
 *   (`192.0.2.1:443:`), or a `.` and an optional key of hexadecimal digits
 *   (`192.0.2.1:`, `peer.fd:`). An IPv6 address has no letter from G to Z, no
 *   `_`, no group of five digits, and a `.` only in its last 32 bits, thus a
 *   match cannot start in the middle of an address. A word with a letter from
 *   G to Z before the `:` is a key, also when its end looks like a part of an
 *   address (`x2001:IP_REDACTED`).
 * - After the IPv4 passes, `IP_REDACTED:` is a key. The IPv6 expression
 *   starts after each IPv4 address (with or without a port) that the IPv4
 *   expression replaces, thus the result contains no new start, and a second
 *   application of the rule changes nothing.
 * - A key of one to four hexadecimal digits after the start of the line, a
 *   boundary character or a `:` (`fd:`, `1:`) can be the first group of an
 *   address. The rule cannot separate it from the address. When the key and
 *   the address are together an IPv6 address (also with a port), the rule
 *   replaces them together (`fd:2001:db8::1`). Else the rule does not find
 *   the address (`fd:2001:db8:1:2:3:4:5:abcd`).
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
 *   (`address[IP_REDACTED]`), like the tag `address[…]` of the game. A key
 *   before the bracket form is a start (`ipv6:[2001:db8::1]:443` gives
 *   `ipv6:IP_REDACTED`). When a different IPv6 address is directly before the
 *   bracket form, with only one character between them, the first pass
 *   replaces only the address in the brackets, and the brackets and the port
 *   stay (`[IP_REDACTED]:443`).
 * - IPv6: all text forms of RFC 4291 (eight groups, the `::` compression, the
 *   last 32 bits as an IPv4 address, for example `::ffff:192.0.2.1`), with the
 *   hexadecimal digits in both cases. A zone stays after the marker
 *   (`IP_REDACTED%eth0`), and a prefix length stays after it
 *   (`IP_REDACTED/32`).
 * - The address `::` alone stays. It is also the scope operator of C++ and a
 *   separator in a text, and it identifies nobody.
 * - C++ names (`CEntity::OnSpawn`) stay: `y:` is a key, but the text after it
 *   (`:OnSpawn`) is not an address. A name of which each part has a maximum
 *   of four letters from A to F (for example `[Bad::Face]`, also after a key:
 *   `Foo:Bad::Face`) is a valid IPv6 address. The rule replaces it. No name of
 *   the patterns has this form.
 * - Times (`12:34:56.789`), dates, GUIDs, hexadecimal ids
 *   (`0x00007FFE2CE13CFA`), MAC addresses (six groups) and decimal numbers with
 *   two or three parts (prices, coordinates) are not addresses, also not after
 *   a key (`time:12:34:56.789`). They stay.
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

/** A character that is not a letter, a digit, `_`, `.` or `:` */
const BOUNDARY = "[^0-9A-Za-z_.:]";

/**
 * The text before an IPv6 address (group 1). A `:` directly before the
 * address must come after text that cannot be a part of the address (see the
 * decisions at the top of this file). At one position, only one of the
 * alternatives can start a match.
 */
const IPV6_START = [
  /** The start of the line or a boundary character, and optionally a `:` */
  `(?:^|${BOUNDARY}):?`,
  /**
   * A key with a letter from G to Z or `_`. The match starts at the last of
   * these letters, thus the hexadecimal digits after it (the `d` of `id:`)
   * are a part of the key.
   */
  "[G-Zg-z_][0-9A-Fa-f]*:",
  /**
   * A key of five or more hexadecimal digits (`10512345:`), or an IPv4
   * address with a port (`192.0.2.1:443:`), after the start of the line, a
   * boundary character or a `:`. After a letter from G to Z, `_` or a `.`,
   * the alternatives above and below take the key. Without the character
   * before the key, each digit of a long run of digits starts a new try, and
   * the time of the expression is quadratic. The IPv4 address has the start
   * of the IPv4 expression, thus the IPv4 passes replace it with the port.
   */
  `(?:^|[^0-9A-Za-z_.])(?:[0-9A-Fa-f]{5,}|${IPV4}${PORT}):`,
  /** A `.` and a key of hexadecimal digits (`192.0.2.1:`, `peer.fd:`) */
  "\\.[0-9A-Fa-f]*:",
].join("|");

/**
 * The source of the IPv6 expression (see the comment at the top of this
 * file). Group 1 is the text before the address, group 2 the characters after
 * it. The bracket form is the first alternative: at the start of the line, it
 * is the longer match.
 */
export const IPV6_ADDRESS_PATTERN_SOURCE = `(${IPV6_START})(?:\\[${IPV6}\\]${PORT}|${IPV6}(?:${PORT})?)(${BOUNDARY}|[.:][^0-9A-Za-z_]|[.:]?$)`;

/**
 * The source of the IPv4 expression (see the comment at the top of this
 * file). Group 1 is the character before the address, group 2 the characters
 * after it.
 */
export const IPV4_ADDRESS_PATTERN_SOURCE = `(^|[^0-9A-Za-z_.])${IPV4}(?:${PORT})?([^0-9A-Za-z_.]|\\.[^0-9A-Za-z_]|\\.?$)`;

/** The expressions in the order of their application */
export const IP_ADDRESS_PATTERNS = [
  { name: "ipv6", source: IPV6_ADDRESS_PATTERN_SOURCE },
  { name: "ipv4", source: IPV4_ADDRESS_PATTERN_SOURCE },
] as const;

export const IP_ADDRESS_PATTERN_SOURCES = IP_ADDRESS_PATTERNS.map(
  ({ source }) => source,
);

/**
 * The replacement for the two expressions, in the syntax of JavaScript (see
 * the top of this file for PostgreSQL)
 */
export const IP_ADDRESS_REPLACEMENT = `$1${IP_ADDRESS_MARKER}$2`;

/** The replacement in the syntax of the `regex` crate of Rust */
export const IP_ADDRESS_REPLACEMENT_FOR_RUST = `\${1}${IP_ADDRESS_MARKER}\${2}`;

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
