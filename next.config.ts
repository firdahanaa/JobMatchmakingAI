import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node"],
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
