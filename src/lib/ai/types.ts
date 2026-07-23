export type AiDocumentInput = {
  type: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export type AiDriverContext = {
  name: string;
  bio?: string | null;
  yearsOfExperience: number;
  languagesSpoken: string[];
  hasPhoto: boolean;
  hasVehicle: boolean;
  vehicle?: {
    make: string;
    model: string;
    year: number;
    plate: string;
    seats: number;
  } | null;
  documents: AiDocumentInput[];
};

export type AiFinding = {
  code: string;
  severity: "info" | "warn" | "critical";
  message: string;
};

export type AiVerificationResult = {
  provider: "heuristic" | "openai";
  riskScore: number;
  confidence: number;
  recommendation: "APPROVE" | "REJECT" | "REQUEST_INFO" | "ESCALATE";
  summary: string;
  findings: AiFinding[];
  documentScores: Record<string, number>;
};

export interface AiVerificationProvider {
  analyzeDriver(ctx: AiDriverContext): Promise<AiVerificationResult>;
}
