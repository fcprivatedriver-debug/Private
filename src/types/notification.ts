export type NotificationType =
  | "trip_created"
  | "proposal_received"
  | "proposal_accepted"
  | "proposal_rejected"
  | "trip_confirmed"
  | "trip_started"
  | "trip_completed"
  | "trip_cancelled"
  | "review_received"
  | "payment_required"
  | "payment_succeeded"
  | "payment_failed"
  | "system";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string;
  readAt?: string;
  createdAt: string;
  metadata?: Record<string, string | number | boolean>;
}
