export type ServiceId =
  | "jovens"
  | "senior"
  | "business"
  | "executivo"
  | "logistico"
  | "diversao-lazer"
  | "pet"
  | "transfers"
  | "turismo-passeios"
  | "motorista-disposicao"
  | "outro";

export type Service = {
  id: ServiceId;
  name: string;
  description: string;
  examples: string[];
  highlights?: string[];
  cta?: string;
  note?: string;
  accent: string;
};

export const SERVICES: Service[] = [
  {
    id: "jovens",
    name: "Jovens",
    description:
      "Mobilidade segura, personalizada e de confiança para crianças e jovens.",
    examples: [
      "Escola",
      "Colégio",
      "Universidade",
      "Ginásio",
      "Golfe",
      "Ténis",
      "Padel",
      "Futebol",
      "Natação",
      "Explicações",
      "Atividades extracurriculares",
      "Festas",
      "Transporte entre atividades",
      "Outros compromissos",
    ],
    highlights: [
      "Motorista conhecido",
      "Pontualidade",
      "Contacto direto",
      "Acompanhamento",
      "Tranquilidade para os pais",
    ],
    accent: "#0A4F5C",
  },
  {
    id: "senior",
    name: "Sénior",
    description:
      "Mais do que transporte. Acompanhamento com tempo, cuidado e atenção.",
    examples: [
      "Consultas",
      "Exames",
      "Hospital",
      "Clínicas",
      "Farmácia",
      "Compras",
      "Supermercado",
      "Banco",
      "Serviços",
      "Passeios",
      "Visitas familiares",
      "Compromissos pessoais",
      "Acompanhamento porta a porta",
    ],
    accent: "#3D5A5B",
  },
  {
    id: "business",
    name: "Business",
    description: "Mobilidade profissional para o seu dia de trabalho.",
    examples: [
      "Reuniões",
      "Escritório",
      "Clientes",
      "Sociedades de advogados",
      "Congressos",
      "Feiras",
      "Almoços de negócios",
      "Visitas profissionais",
      "Vários compromissos no mesmo dia",
      "Clientes e convidados empresariais",
    ],
    accent: "#1A3A40",
  },
  {
    id: "executivo",
    name: "Executivo",
    description:
      "Serviço premium para quem valoriza tempo, conforto e discrição.",
    examples: [
      "Empresários",
      "CEOs",
      "Administradores",
      "Advogados",
      "Investidores",
      "Executivos",
      "Artistas",
      "Personalidades",
      "Clientes VIP",
      "Reuniões confidenciais",
      "Agenda personalizada",
    ],
    highlights: [
      "Discrição",
      "Pontualidade",
      "Conforto",
      "Apresentação",
      "Flexibilidade",
      "Atendimento personalizado",
    ],
    accent: "#073A44",
  },
  {
    id: "logistico",
    name: "Logístico",
    description: "Quando precisa que alguém resolva uma deslocação por si.",
    examples: [
      "Recolha de documentos",
      "Entrega de documentos",
      "Pequenas encomendas",
      "Entregas urgentes",
      "Recolhas em lojas",
      "Levantamento de compras",
      "Pequenos serviços externos",
      "Apoio logístico pessoal",
    ],
    note: "Não se trata de mudanças ou transporte pesado.",
    accent: "#4A7F89",
  },
  {
    id: "diversao-lazer",
    name: "Diversão & Lazer",
    description: "Desfrute do momento. Nós tratamos da deslocação.",
    examples: [
      "Jantares",
      "Restaurantes",
      "Bares",
      "Discotecas",
      "Concertos",
      "Festivais",
      "Casino",
      "Torneios de poker",
      "Festas",
      "Casamentos",
      "Aniversários",
      "Eventos",
      "Ida e regresso",
    ],
    accent: "#0A4F5C",
  },
  {
    id: "pet",
    name: "Pet",
    description: "Mobilidade confortável também para o seu companheiro.",
    examples: [
      "Veterinário",
      "Hospital veterinário",
      "Grooming",
      "Creche",
      "Hotel para animais",
      "Parque",
      "Praia",
      "Aeroporto",
      "Mudanças",
      "Outras deslocações",
    ],
    accent: "#5C7A6A",
  },
  {
    id: "transfers",
    name: "Transfers",
    description: "Recolha programada e transporte direto ao seu destino.",
    examples: [
      "Aeroporto",
      "Aeródromo",
      "Estação",
      "Terminal de cruzeiros",
      "Marina",
      "Residência",
      "Empresa",
      "Eventos",
      "Recolha de familiares ou convidados",
    ],
    accent: "#0A4F5C",
  },
  {
    id: "turismo-passeios",
    name: "Turismo & Passeios",
    description: "Descubra Portugal ao seu ritmo.",
    examples: [
      "Sintra",
      "Cascais",
      "Estoril",
      "Guincho",
      "Cabo da Roca",
      "Lisboa",
      "Fátima",
      "Nazaré",
      "Óbidos",
      "Évora",
      "Arrábida",
      "Roteiros personalizados",
    ],
    note: "Não vendemos excursões rígidas. Explique o que pretende e preparamos o serviço.",
    accent: "#2F5D50",
  },
  {
    id: "motorista-disposicao",
    name: "Motorista à Disposição",
    description: "O seu motorista privado durante o tempo que precisar.",
    examples: [
      "Reuniões",
      "Compras",
      "Eventos",
      "Várias deslocações",
      "Agenda de um dia",
      "Compromissos sucessivos",
      "Espera",
      "Acompanhamento",
    ],
    note: "Preço mediante duração e serviço pretendido.",
    cta: "Pedir orçamento",
    accent: "#073A44",
  },
];

export function getService(id: string): Service | undefined {
  return SERVICES.find((s) => s.id === id);
}

export const SERVICE_OPTIONS = [
  ...SERVICES.map((s) => ({ value: s.id, label: s.name })),
  { value: "outro" as const, label: "Outro" },
];
