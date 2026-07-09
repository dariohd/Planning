export const PROD_ROLES = ["REAP", "Compagnon", "Intérimaire", "Pilote", "Apprenti Atelier"] as const;

export const SUPPORT_ROLES = [
  "RP",
  "REAP",
  "MFT",
  "Apprenti",
  "Responsable Preparateur",
  "Préparateur",
  "Responsable Qualité",
  "Qualité",
] as const;

export const PRESENT_STATUSES = ["M", "A", "N", "J"] as const;

export const STATUS_LABELS: Record<string, string> = {
  J: "J",
  M: "M",
  A: "A",
  N: "N",
  CP: "CP",
  "4HCP": "½CP",
  JRTT: "JRTT",
  Abs: "Abs",
  RF: "RF",
  Ma: "Ma",
  LMa: "LMa",
  F: "F",
  "4HF": "½F",
  P: "P",
  Z: "Z",
  S: "S",
  Mi: "Mi",
  Ecole: "Ecole",
  CET: "CET",
  SC: "SC",
  SL: "SL",
};

export const STATUS_BG: Record<string, string> = {
  M: "bg-[#A5DFF0] text-[#21758A]",
  A: "bg-blue-100 text-blue-800",
  N: "bg-[#9cb4d4] text-[#00205b]",
  J: "bg-yellow-100 text-yellow-800",
  Abs: "bg-red-500 text-white",
  Ma: "bg-red-500 text-white",
  LMa: "bg-red-900 text-white",
  CP: "bg-pink-500 text-white",
  "4HCP": "bg-pink-500 text-white",
  JRTT: "bg-cyan-500 text-white",
  CET: "bg-amber-500 text-white",
  Ecole: "bg-orange-500 text-white",
  F: "bg-orange-500 text-white",
  "4HF": "bg-orange-500 text-white",
  P: "bg-slate-300 text-slate-800",
  D: "bg-slate-300 text-slate-800",
  S: "bg-slate-300 text-slate-800",
  Z: "bg-slate-300 text-slate-800",
};

export const DISPLAY_POSTES = ["DRA718", "DRA716", "DRA715", "DRA714"] as const;
