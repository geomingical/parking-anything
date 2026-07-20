import { describe, expect, it, vi } from "vitest";

import {
  validatePublicUrl,
  type DnsResolver,
} from "./url-safety";

function resolveTo(...addresses: string[]): DnsResolver {
  return vi.fn(async () =>
    addresses.map((address) => ({
      address,
      family: address.includes(":") ? (6 as const) : (4 as const),
    })),
  );
}

describe("validatePublicUrl", () => {
  it("normalizes a public HTTPS URL", async () => {
    await expect(
      validatePublicUrl("https://Example.com", resolveTo("93.184.216.34")),
    ).resolves.toBe("https://example.com/");
  });

  it.each(["not a URL", "https://", "//example.com/path"])(
    "rejects malformed input: %s",
    async (input) => {
      await expect(validatePublicUrl(input, resolveTo("93.184.216.34"))).rejects.toThrow(
        "Enter a valid URL.",
      );
    },
  );

  it.each(["ftp://example.com/file", "file:///tmp/secret", "data:text/plain,hello"])(
    "rejects a non-HTTP protocol: %s",
    async (input) => {
      await expect(validatePublicUrl(input, resolveTo("93.184.216.34"))).rejects.toThrow(
        "Only HTTP(S) URLs are supported.",
      );
    },
  );

  it("rejects embedded credentials before DNS resolution", async () => {
    const resolver = resolveTo("93.184.216.34");

    await expect(
      validatePublicUrl("https://user:password@example.com", resolver),
    ).rejects.toThrow("URLs with embedded credentials are not supported.");
    expect(resolver).not.toHaveBeenCalled();
  });

  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "172.16.0.1",
    "192.168.1.20",
    "169.254.1.1",
    "0.0.0.0",
  ])("rejects non-public IPv4 address %s", async (address) => {
    await expect(
      validatePublicUrl(`http://${address}/admin`, resolveTo(address)),
    ).rejects.toThrow("URL resolves to a non-public address.");
  });

  it.each(["::1", "fc00::1", "fd12:3456::1", "fe80::1"])(
    "rejects non-public IPv6 address %s",
    async (address) => {
      await expect(
        validatePublicUrl(`http://[${address}]/admin`, resolveTo(address)),
      ).rejects.toThrow("URL resolves to a non-public address.");
    },
  );

  it("normalizes IPv4-mapped IPv6 before checking its range", async () => {
    await expect(
      validatePublicUrl("http://[::ffff:127.0.0.1]/admin", resolveTo("::ffff:127.0.0.1")),
    ).rejects.toThrow("URL resolves to a non-public address.");
  });

  it("accepts public IPv4 and IPv6 literals without DNS", async () => {
    const resolver = resolveTo("127.0.0.1");

    await expect(validatePublicUrl("https://93.184.216.34/path", resolver)).resolves.toBe(
      "https://93.184.216.34/path",
    );
    await expect(validatePublicUrl("https://[2606:4700:4700::1111]/", resolver)).resolves.toBe(
      "https://[2606:4700:4700::1111]/",
    );
    expect(resolver).not.toHaveBeenCalled();
  });

  it("rejects a hostname if any DNS answer is non-public", async () => {
    await expect(
      validatePublicUrl(
        "https://mixed.example",
        resolveTo("93.184.216.34", "10.0.0.2"),
      ),
    ).rejects.toThrow("URL resolves to a non-public address.");
  });

  it("rejects localhost through resolved loopback", async () => {
    await expect(
      validatePublicUrl("http://localhost/admin", resolveTo("127.0.0.1")),
    ).rejects.toThrow("URL resolves to a non-public address.");
  });

  it("rejects hostnames with no DNS answers", async () => {
    await expect(validatePublicUrl("https://missing.example", resolveTo())).rejects.toThrow(
      "URL could not be resolved.",
    );
  });

  it("uses the same validation for a redirect target", async () => {
    await expect(
      validatePublicUrl("http://169.254.169.254/latest/meta-data", resolveTo()),
    ).rejects.toThrow("URL resolves to a non-public address.");
  });
});
