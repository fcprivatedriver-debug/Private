import { redirect } from "next/navigation";

/** Mantém URL antiga; a vista completa está em /agenda. */
export default function CalendarRedirectPage() {
  redirect("/pt/agenda?mode=week");
}
