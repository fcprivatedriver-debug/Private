import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    localPatterns: [{ pathname: "/brand/**" }, { pathname: "/fleet/**" }],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/pt", destination: "/", permanent: false },
      { source: "/pt/:path*", destination: "/:path*", permanent: false },
      { source: "/en", destination: "/", permanent: false },
      { source: "/en/:path*", destination: "/:path*", permanent: false },
      { source: "/login", destination: "/contactos", permanent: false },
      { source: "/registo", destination: "/contactos", permanent: false },
      { source: "/planos", destination: "/servicos", permanent: false },
      { source: "/planos/:path*", destination: "/servicos", permanent: false },
      { source: "/cliente", destination: "/", permanent: false },
      { source: "/cliente/:path*", destination: "/", permanent: false },
      { source: "/admin", destination: "/", permanent: false },
      { source: "/admin/:path*", destination: "/", permanent: false },
      { source: "/ativar", destination: "/", permanent: false },
      { source: "/recuperar", destination: "/", permanent: false },
      { source: "/contacto", destination: "/contactos", permanent: false },
    ];
  },
};

export default nextConfig;
