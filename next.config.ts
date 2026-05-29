import { createMDX } from "fumadocs-mdx/next";
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withMDX = createMDX();
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
};

export default withNextIntl(withMDX(nextConfig));
