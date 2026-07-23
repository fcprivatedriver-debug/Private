export type ReviewTarget = "driver" | "client";

export interface Review {
  id: string;
  tripId: string;
  authorId: string;
  targetId: string;
  targetType: ReviewTarget;
  rating: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewSummary {
  average: number;
  count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}
