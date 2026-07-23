import { clsx, type ClassValue } from "clsx";
import { NextResponse } from "next/server";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
