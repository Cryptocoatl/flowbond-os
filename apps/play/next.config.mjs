import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const monorepoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the trace root to the monorepo (a stray ~/package-lock.json otherwise
  // makes Next infer the wrong workspace root).
  outputFileTracingRoot: monorepoRoot,
  transpilePackages: [
    '@flowbond/world-runtime',
    '@flowbond/state-engine',
    '@flowbond/mission-bridge',
  ],
  eslint: { ignoreDuringBuilds: true },
  webpack: (config) => {
    // Spark (@sparkjsdev/spark) references its web workers via
    // `new URL(..., import.meta.url)`, which Next's webpack tries to emit as an
    // asset module and rejects ("asset/inline generator has property filename").
    // Disable `new URL` asset parsing for Spark; it falls back to its runtime
    // blob-worker path in the browser.
    config.module.rules.push({
      test: /[\\/]@sparkjsdev[\\/]spark[\\/]/,
      parser: { url: false },
    });
    return config;
  },
};

export default nextConfig;
