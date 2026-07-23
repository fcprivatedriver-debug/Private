export const siteConfig = {
  name: "FC Private Driver",
  shortName: "FC Private",
  description:
    "Marketplace profissional de motoristas privados. Peça a sua viagem, compare propostas e viaje com confiança.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  locale: "pt-PT",
  supportEmail: "suporte@fcprivatedriver.com",
  social: {
    instagram: "#",
    linkedin: "#",
  },
} as const;

export type SiteConfig = typeof siteConfig;
