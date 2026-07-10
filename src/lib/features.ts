/** Affiche les options de migration Google Sheets / GAS (désactivé en prod standard). */
export const LEGACY_SHEETS_IMPORT_ENABLED =
  process.env.NEXT_PUBLIC_LEGACY_SHEETS_IMPORT === "true";
