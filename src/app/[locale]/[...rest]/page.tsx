import { notFound } from "next/navigation";

/** Catch-all inside a valid locale → localized 404. */
export default function CatchAllPage() {
  notFound();
}
