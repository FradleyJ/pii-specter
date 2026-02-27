import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["http://ubuntuserver:3000", "http://ubuntuserver:3002"],
};

export default nextConfig;
