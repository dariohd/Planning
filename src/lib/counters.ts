import type { DayPresence } from "./types";

const CP_STATUSES = new Set(["CP", "4HCP"]);
const JRTT_STATUSES = new Set(["JRTT", "CET"]);
const MALADIE_STATUSES = new Set(["Ma", "LMa", "Abs"]);
const FORMATION_STATUSES = new Set(["Ecole", "F", "4HF"]);

export type IndividualCounters = {
  cp: number;
  jrtt: number;
  maladie: number;
  formation: number;
  presence: number;
  horsProd: number;
};

export function computeIndividualCounters(presences: Record<string, DayPresence>): IndividualCounters {
  const counters: IndividualCounters = {
    cp: 0,
    jrtt: 0,
    maladie: 0,
    formation: 0,
    presence: 0,
    horsProd: 0,
  };

  for (const { s } of Object.values(presences)) {
    if (!s) continue;
    if (CP_STATUSES.has(s)) counters.cp += s === "4HCP" ? 0.5 : 1;
    else if (JRTT_STATUSES.has(s)) counters.jrtt += 1;
    else if (MALADIE_STATUSES.has(s)) counters.maladie += 1;
    else if (FORMATION_STATUSES.has(s)) counters.formation += s === "4HF" ? 0.5 : 1;
    else if (["M", "A", "N", "J"].includes(s)) counters.presence += 1;
    else if (["P", "Z", "S", "D", "Mi"].includes(s)) counters.horsProd += 1;
  }

  return counters;
}
