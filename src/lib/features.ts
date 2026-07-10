/** Liaison Google Sheets dans Paramètres > Données (activée par défaut). */
export const SHEETS_SYNC_ENABLED = process.env.NEXT_PUBLIC_SHEETS_SYNC !== "false";

/** @deprecated alias conservé pour les imports existants */
export const LEGACY_SHEETS_IMPORT_ENABLED = SHEETS_SYNC_ENABLED;
