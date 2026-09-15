import { APP_NAME as BRAND_APP_NAME, APP_TAGLINE as BRAND_TAGLINE } from "@/config/brand";

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || BRAND_APP_NAME;
export const APP_TAGLINE = BRAND_TAGLINE;
export const DEFAULT_CURRENCY = "EUR";
export const DEFAULT_TIMEZONE = "Europe/Lisbon";

export const BUDGET_ALERT_THRESHOLDS = [75, 90, 100] as const;
