export type FleetVehicle = {
  id: string;
  model: string;
  year: string;
  color: string;
  colorLabel: string;
  image: string;
  alt: string;
};

export const FLEET: FleetVehicle[] = [
  {
    id: "model3-2024-branco",
    model: "Tesla Model 3",
    year: "2024",
    color: "Branco",
    colorLabel: "Branco",
    image: "/fleet/tesla-model3-2024-branco.jpg",
    alt: "Tesla Model 3 2024 branco — frota FC Private Driver",
  },
  {
    id: "model3-2025-preto",
    model: "Tesla Model 3",
    year: "2025",
    color: "Preto",
    colorLabel: "Preto",
    image: "/fleet/tesla-model3-2025-preto.jpg",
    alt: "Tesla Model 3 2025 preto — frota FC Private Driver",
  },
  {
    id: "modely-2026-preto",
    model: "Tesla Model Y",
    year: "2026",
    color: "Preto",
    colorLabel: "Preto",
    image: "/fleet/tesla-modely-2026-preto.jpg",
    alt: "Tesla Model Y 2026 preto — frota FC Private Driver",
  },
];

export const FLEET_INTRO = "Conforto, segurança e elegância em cada viagem.";
