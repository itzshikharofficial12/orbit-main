import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, "../../"),
  serverExternalPackages: ["@supabase/ssr", "@supabase/supabase-js", "pdfkit"],
};

export default nextConfig;
