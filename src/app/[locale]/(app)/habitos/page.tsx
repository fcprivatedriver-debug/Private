import { redirect } from "next/navigation";

/** Alias antigo — a experiência vive em /objectivos. */
export default function HabitsRedirect() {
  redirect("/pt/objectivos");
}
