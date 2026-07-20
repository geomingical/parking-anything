import { lookup } from "node:dns/promises";

import ipaddr from "ipaddr.js";

export type DnsAddress = {
  address: string;
  family: 4 | 6;
};

export type DnsResolver = (hostname: string) => Promise<DnsAddress[]>;

const systemResolver: DnsResolver = async (hostname) => {
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  return addresses.map(({ address, family }) => ({
    address,
    family: family as 4 | 6,
  }));
};

function withoutIpv6Brackets(hostname: string): string {
  return hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;
}

function isPublicAddress(address: string): boolean {
  if (!ipaddr.isValid(address)) return false;

  let parsed = ipaddr.parse(address);
  if (parsed.kind() === "ipv6" && parsed.isIPv4MappedAddress()) {
    parsed = parsed.toIPv4Address();
  }

  return parsed.range() === "unicast";
}

export async function validatePublicUrl(
  input: string,
  resolver: DnsResolver = systemResolver,
): Promise<string> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("Enter a valid URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only HTTP(S) URLs are supported.");
  }

  if (url.username || url.password) {
    throw new Error("URLs with embedded credentials are not supported.");
  }

  const hostname = withoutIpv6Brackets(url.hostname);
  if (ipaddr.isValid(hostname)) {
    if (!isPublicAddress(hostname)) {
      throw new Error("URL resolves to a non-public address.");
    }
    return url.toString();
  }

  let addresses: DnsAddress[];
  try {
    addresses = await resolver(hostname);
  } catch {
    throw new Error("URL could not be resolved.");
  }

  if (addresses.length === 0) {
    throw new Error("URL could not be resolved.");
  }

  if (addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new Error("URL resolves to a non-public address.");
  }

  return url.toString();
}
