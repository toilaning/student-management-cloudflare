/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    if (!dev) {
      // Tắt filesystem cache của Webpack trong production build
      // để tránh lỗi corrupted cache (PackFileCacheStrategy TypeError) trên CI/Cloudflare Pages
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
