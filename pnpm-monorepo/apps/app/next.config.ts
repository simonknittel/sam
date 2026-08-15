import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { env } from "./src/env";

/**
 * S3_PUBLIC_URL is either a bare host (https implied) or a full base URL
 * incl. scheme, port and bucket path — see its doc comment in src/env.ts.
 * The variable can be undefined despite its type when the env validation is
 * skipped (SKIP_VALIDATION=1, e.g. `next typegen` in CI) — the placeholder
 * keeps the config loadable.
 */
const s3PublicUrlRaw =
  (env.S3_PUBLIC_URL as string | undefined) || "uploads.invalid";
const s3PublicUrl = new URL(
  s3PublicUrlRaw.includes("://") ? s3PublicUrlRaw : `https://${s3PublicUrlRaw}`,
);

const nextConfig: NextConfig = {
  reactStrictMode: true,

  cleanDistDir: true,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
      },
      {
        protocol: s3PublicUrl.protocol === "http:" ? "http" : "https",
        hostname: s3PublicUrl.hostname,
        port: s3PublicUrl.port,
        pathname:
          s3PublicUrl.pathname === "/"
            ? "/**"
            : `${s3PublicUrl.pathname.replace(/\/+$/, "")}/**`,
      },
      {
        protocol: "https",
        hostname: "robertsspaceindustries.com",
      },
    ],
    /**
     * The optimizer refuses loopback IPs by default (SSRF protection).
     * Only enabled when the uploads bucket itself is local (dev stack,
     * Playwright) — never the case in deployments.
     */
    dangerouslyAllowLocalIP: ["localhost", "127.0.0.1", "[::1]"].includes(
      s3PublicUrl.hostname,
    ),
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    qualities: [75, 100],
  },

  poweredByHeader: false,

  // eslint-disable-next-line @typescript-eslint/require-await
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        {
          key: "X-DNS-Prefetch-Control",
          value: "on",
        },
        {
          key: "X-Frame-Options",
          value: "SAMEORIGIN",
        },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains; preload",
        },
      ],
    },
    {
      source: "/service-worker.js",
      headers: [
        {
          key: "Cache-Control",
          value: "no-store, no-cache, must-revalidate, max-age=0",
        },
      ],
    },
    {
      source: "/manifest.webmanifest",
      headers: [
        {
          key: "Cache-Control",
          value: "no-store, no-cache, must-revalidate, max-age=0",
        },
      ],
    },
  ],

  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // eslint-disable-next-line @typescript-eslint/require-await
  redirects: async () => [
    {
      source: "/app/career",
      destination: "/app/career/security",
      permanent: false,
    },
    {
      source: "/app/external/schwarzmarkt-ankauf",
      destination: "/app/external/scrappers-codex",
      permanent: true,
    },
  ],

  experimental: {
    authInterrupts: true,
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
