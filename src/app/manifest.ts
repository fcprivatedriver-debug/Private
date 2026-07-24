import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nina",
    short_name: "Nina",
    description:
      "Assistente financeira pessoal e familiar. Captura por voz, fotografia e texto — a Nina trata do resto.",
    start_url: "/pt/dashboard",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "fullscreen", "minimal-ui"],
    orientation: "portrait-primary",
    background_color: "#1e3a5f",
    theme_color: "#1e3a5f",
    lang: "pt-PT",
    dir: "ltr",
    categories: ["finance", "productivity", "lifestyle"],
    id: "/pt/dashboard",
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
        name: "Dashboard",
        short_name: "Dashboard",
        description: "Abrir o painel e falar com a Nina",
        url: "/pt/dashboard?utm_source=pwa_shortcut&utm_medium=dashboard",
        icons: [{ src: "/icons/shortcut-dashboard.png", sizes: "96x96", type: "image/png" }],
      },
      {
        name: "Falar com a Nina",
        short_name: "Falar",
        description: "Captura rápida por voz",
        url: "/pt/captura?mode=voice&auto=1&utm_source=pwa_shortcut&utm_medium=voice",
        icons: [{ src: "/icons/shortcut-voice.png", sizes: "96x96", type: "image/png" }],
      },
      {
        name: "Fotografar Fatura",
        short_name: "Fatura",
        description: "Abrir câmara para ler a fatura",
        url: "/pt/captura?mode=photo&auto=1&utm_source=pwa_shortcut&utm_medium=photo",
        icons: [{ src: "/icons/shortcut-photo.png", sizes: "96x96", type: "image/png" }],
      },
      {
        name: "Lista de Compras",
        short_name: "Compras",
        description: "Abrir a lista de compras",
        url: "/pt/lista?utm_source=pwa_shortcut&utm_medium=lista",
        icons: [{ src: "/icons/shortcut-lista.png", sizes: "96x96", type: "image/png" }],
      },
      {
        name: "Objetivos",
        short_name: "Objetivos",
        description: "Ver poupanças e objetivos",
        url: "/pt/objetivos?utm_source=pwa_shortcut&utm_medium=objetivos",
        icons: [{ src: "/icons/shortcut-objetivos.png", sizes: "96x96", type: "image/png" }],
      },
    ],
    related_applications: [],
    prefer_related_applications: false,
  };
}

/** Used only when generating absolute URLs externally */
