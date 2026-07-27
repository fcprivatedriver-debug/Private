import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mel",
    short_name: "Mel",
    description:
      "Assistente pessoal inteligente. Tarefas, calendário, voz e relatórios semanais.",
    start_url: "/pt/hoje",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#14212B",
    theme_color: "#C9892E",
    lang: "pt-PT",
    dir: "ltr",
    categories: ["productivity", "lifestyle"],
    id: "/pt/hoje",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "Hoje",
        short_name: "Hoje",
        url: "/pt/hoje",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Falar com a Mel",
        short_name: "Falar",
        url: "/pt/captura",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Tarefas",
        short_name: "Tarefas",
        url: "/pt/tarefas",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
