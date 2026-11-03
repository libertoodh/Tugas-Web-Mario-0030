import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["nodemailer"],
  poweredByHeader: false,
};

export default nextConfig;
