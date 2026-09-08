import type { AuthorProfile } from "./types";

/**
 * SAMPLE author profile — demonstrates the author system foundation
 * (no "By Admin"). Replace with real editorial profiles in Phase 2.
 */
export const sampleAuthor: AuthorProfile = {
  id: "author-1",
  key: "salma-benali",
  name: "Salma Benali", // sample profile for Phase 1 — replace with real authors
  avatarInitials: "SB",
  links: [],
  translations: {
    en: {
      role: "Travel Editor — Morocco & family travel",
      biography:
        "Salma is a Casablanca-based travel editor who has spent the last decade exploring every region of Morocco and writing practical guides for families. She verifies every route, price and timetable before publishing.",
      expertise: ["Morocco travel", "Family itineraries", "Travel logistics"],
    },
    es: {
      role: "Editora de viajes — Marruecos y viajes en familia",
      biography:
        "Salma es una editora de viajes de Casablanca que lleva una década recorriendo todas las regiones de Marruecos y escribiendo guías prácticas para familias. Verifica cada ruta, precio y horario antes de publicar.",
      expertise: ["Viajes por Marruecos", "Itinerarios en familia", "Logística de viajes"],
    },
    ar: {
      role: "محررة سفر — المغرب والسفر العائلي",
      biography:
        "سلمى محررة سفر من الدار البيضاء، أمضت العقد الأخير في استكشاف جميع جهات المغرب وكتابة أدلة عملية للعائلات. تتحقق من كل طريق وكل سعر وكل جدول زمني قبل النشر.",
      expertise: ["السفر في المغرب", "برامج عائلية", "اللوجستيك السفر"],
    },
  },
};

export const authors: Record<string, AuthorProfile> = {
  [sampleAuthor.id]: sampleAuthor,
};

export function getAuthor(id: string): AuthorProfile {
  return authors[id] ?? sampleAuthor;
}
