import type { NextConfig } from "next";
import path from "node:path";

const emptyModuleAlias = "@/lib/stubs/empty-module";
const emptyModulePath = path.join(
  process.cwd(),
  "src",
  "lib",
  "stubs",
  "empty-module.ts",
);

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      effect: emptyModuleAlias,
      sury: emptyModuleAlias,
      "@valibot/to-json-schema": emptyModuleAlias,
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      effect: emptyModulePath,
      sury: emptyModulePath,
      "@valibot/to-json-schema": emptyModulePath,
    };
    return config;
  },
};

export default nextConfig;
