/** FC Private Driver — brand tokens */
export const BRAND = {
  name: "FC Private Driver",
  shortName: "FC",
  tagline: "O seu motorista privado, sempre que precisar.",
  email: "fcprivatedriver@gmail.com",
  phoneDisplay: "+351 933 239 595",
  phoneE164: "+351933239595",
  whatsappUrl: "https://wa.me/351933239595",
  ink: "#1A1A1A",
  charcoal: "#111111",
  white: "#FFFFFF",
  petrol: "#0A4F5C",
  petrolStrong: "#073A44",
  petrolSoft: "#E6F1F3",
  petrolMuted: "#4A7F89",
  heroImage: "/brand/fc-hero.jpg",
  logo: "/brand/fc-mark.svg",
  logoLight: "/brand/fc-mark-light.svg",
  icon: "/brand/fc-icon.svg",
} as const;

/** Only used when NEXT_PUBLIC_DEMO_MODE=true */
export const DEMO_ACCOUNTS = [
  { email: "admin@fcprivatedriver.demo", role: "ADMIN", label: "Administrador" },
  { email: "cliente@fcprivatedriver.demo", role: "CUSTOMER", label: "Cliente" },
] as const;

export const DEMO_PASSWORD = "fcpd1234";
