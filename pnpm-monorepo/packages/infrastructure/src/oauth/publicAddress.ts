import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { BlockList, isIP, type LookupFunction } from "node:net";

/** IPv4 ranges that are not public (IANA special-purpose address registry) */
const NON_PUBLIC_IPV4_SUBNETS: readonly (readonly [string, number])[] = [
  ["0.0.0.0", 8], // "this network", includes the unspecified address
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // shared address space (carrier-grade NAT)
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local, includes cloud metadata services
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // documentation
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // documentation
  ["203.0.113.0", 24], // documentation
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved, includes the broadcast address
];

/**
 * Only the global unicast range (2000::/3) of IPv6 is public. This excludes
 * the unspecified address, loopback, IPv4-mapped addresses, NAT64,
 * unique-local, link-local and multicast addresses.
 */
const PUBLIC_IPV6_SUBNET = ["2000::", 3] as const;

/** Parts of the global unicast range that are not public or that tunnel IPv4 */
const NON_PUBLIC_IPV6_SUBNETS: readonly (readonly [string, number])[] = [
  ["2001::", 23], // IETF protocol assignments, includes Teredo
  ["2001:db8::", 32], // documentation
  ["2002::", 16], // 6to4, can contain a private IPv4 address
];

const nonPublicAddresses = new BlockList();
for (const [network, prefix] of NON_PUBLIC_IPV4_SUBNETS)
  nonPublicAddresses.addSubnet(network, prefix, "ipv4");
for (const [network, prefix] of NON_PUBLIC_IPV6_SUBNETS)
  nonPublicAddresses.addSubnet(network, prefix, "ipv6");

const publicIpv6Addresses = new BlockList();
publicIpv6Addresses.addSubnet(...PUBLIC_IPV6_SUBNET, "ipv6");

const loopbackAddresses = new BlockList();
loopbackAddresses.addSubnet("127.0.0.0", 8, "ipv4");
loopbackAddresses.addAddress("::1", "ipv6");

const getFamily = (address: string) => {
  switch (isIP(address)) {
    case 4:
      return "ipv4";
    case 6:
      return "ipv6";
    default:
      return null;
  }
};

/**
 * Whether an IP address is on the public internet. The SSRF protection
 * refuses all other addresses, thus a client id cannot make the server send
 * a request into a private network.
 */
export const isPublicAddress = (address: string) => {
  const family = getFamily(address);
  if (!family) return false;

  if (family === "ipv6" && !publicIpv6Addresses.check(address, family))
    return false;

  return !nonPublicAddresses.check(address, family);
};

export const isLoopbackAddress = (address: string) => {
  const family = getFamily(address);
  if (!family) return false;

  return loopbackAddresses.check(address, family);
};

/**
 * A `lookup` for `http.request()` that resolves the hostname and refuses the
 * connection when one of the addresses is not permitted. The check happens
 * at connect time, on the address that the socket uses, thus a DNS answer
 * that changes between a check and the request (DNS rebinding) cannot
 * bypass it.
 *
 * Node.js does not call `lookup` for a hostname that is an IP address. Check
 * such a hostname before the request.
 */
export const createValidatingLookup =
  (isPermittedAddress: (address: string) => boolean): LookupFunction =>
  (hostname, options, callback) => {
    dnsLookup(hostname, { ...options, all: true }, (error, addresses) => {
      if (error) {
        callback(error, "", 0);
        return;
      }

      const forbiddenAddress = addresses.find(
        ({ address }) => !isPermittedAddress(address),
      );
      const [firstAddress] = addresses;
      if (forbiddenAddress || !firstAddress) {
        callback(
          Object.assign(
            new Error(
              `The host ${hostname} does not resolve to a permitted address`,
            ),
            { code: "ERR_ADDRESS_NOT_PERMITTED" },
          ),
          "",
          0,
        );
        return;
      }

      if (options.all) {
        // The type of the callback does not know the `all` option
        (
          callback as (
            error: NodeJS.ErrnoException | null,
            addresses: LookupAddress[],
          ) => void
        )(null, addresses);
        return;
      }

      callback(null, firstAddress.address, firstAddress.family);
    });
  };
