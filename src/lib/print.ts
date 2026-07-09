import { STATUS_LABELS } from "./constants";
import { fullName } from "./personnel";
import type { WeeklySchedule } from "./types";

export function buildPrintableHtml(
  schedules: WeeklySchedule[],
  lang: "fr" | "en" | "pt" = "fr"
): string {
  const t =
    lang === "en"
      ? { planning: "Schedule:", week: "Week from", to: "to", staff: "Staff (Station - ID)", total: "Total Present:", empty: "No schedule." }
      : lang === "pt"
        ? { planning: "Escala:", week: "Semana de", to: "a", staff: "Pessoal (Posto - Mat.)", total: "Total Presentes:", empty: "Nenhuma escala." }
        : { planning: "Planning :", week: "Semaine du", to: "au", staff: "Personnel (Poste - Mat.)", total: "Total Présents :", empty: "Aucun planning." };

  const sTr = STATUS_LABELS;
  let body = "";

  for (const data of schedules) {
    if (!data.teamMembers?.length) continue;

    const members = [...data.teamMembers].sort((a, b) => {
      const pa = (a.posteDeTravail || "Z").toUpperCase();
      const pb = (b.posteDeTravail || "Z").toUpperCase();
      if (pa !== pb) return pa.localeCompare(pb);
      return fullName(a).localeCompare(fullName(b));
    });

    body += `<div class="team-section"><h1>${t.planning} ${data.teamName}</h1>`;
    body += `<h2>${t.week} ${data.weekDates[0]} ${t.to} ${data.weekDates[6]}</h2>`;
    body += `<table><thead><tr><th>${t.staff}</th>`;
    for (const d of data.weekDates) body += `<th>${d.slice(5)}</th>`;
    body += `</tr></thead><tbody>`;

    let lastPoste: string | null = null;
    for (const m of members) {
      const poste = m.posteDeTravail || "Non assigné";
      const sep = lastPoste && lastPoste !== poste ? ' class="poste-separator"' : "";
      lastPoste = poste;
      const interim = m.role === "Intérimaire" ? " cell-interim" : "";
      body += `<tr${sep}><td class="col-name${interim}"><span class="person-name">${m.nom} ${m.prenom}</span> <span class="meta">(${poste} - ${m.matricule ?? "N/A"})</span></td>`;
      for (const d of data.weekDates) {
        const st = data.schedule[m.id]?.[d] ?? "";
        body += `<td class="status-cell status-bg-${st}">${sTr[st] || st}</td>`;
      }
      body += `</tr>`;
    }

    body += `</tbody><tfoot><tr><td class="col-name" style="text-align:right">${t.total}</td>`;
    for (const d of data.weekDates) {
      let n = 0;
      for (const m of members) {
        if (m.role === "Apprenti Atelier") continue;
        const st = data.schedule[m.id]?.[d];
        if (st && ["M", "A", "N", "J"].includes(st)) n++;
      }
      body += `<td>${n || ""}</td>`;
    }
    body += `</tr></tfoot></table></div>`;
  }

  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="UTF-8"><title>${t.planning}</title>
<style>
@page{size:A4 portrait;margin:0.5cm}body{font-family:Poppins,sans-serif;font-size:10px;margin:0}
table{width:100%;border-collapse:collapse}th,td{border:1px solid #666;padding:2px;text-align:center}
.col-name{width:35%;text-align:left;padding-left:8px}.person-name{font-weight:700}
.cell-interim{background:#d1edf2!important}.poste-separator td{border-top:2px solid #000!important}
.status-bg-M{background:#A5DFF0}.status-bg-A{background:#dbeafe}.status-bg-N{background:#9cb4d4}
.status-bg-J{background:#fef9c3}.status-bg-Abs,.status-bg-Ma{background:#ef4444;color:#fff}
</style></head><body>${body || `<p>${t.empty}</p>`}</body></html>`;
}

export function schedulesFromWeekly(
  weekly: WeeklySchedule,
  selectionLabel: string
): WeeklySchedule[] {
  return [{ ...weekly, teamName: selectionLabel.replace(" (REAP)", "").replace(" (RP)", "") }];
}
