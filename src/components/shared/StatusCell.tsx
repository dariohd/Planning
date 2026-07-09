import { STATUS_BG, STATUS_LABELS } from "@/lib/constants";
import type { DayPresence } from "@/lib/types";

type Props = {
  status: string;
  details?: DayPresence;
  isWeekend?: boolean;
  isHoliday?: boolean;
  className?: string;
  onClick?: () => void;
};

export function StatusCell({ status, details, isWeekend, isHoliday, className = "", onClick }: Props) {
  const bg = STATUS_BG[status] ?? "bg-white text-slate-700";
  const label = STATUS_LABELS[status] ?? status;
  const bgCell = isHoliday ? "bg-amber-50" : isWeekend ? "bg-slate-100" : "";

  return (
    <td
      className={`border border-slate-300 text-center text-xs font-bold p-1 relative ${bg} ${bgCell} ${className} ${onClick ? "cursor-pointer hover:opacity-80" : ""}`}
      onClick={onClick}
      title={[status, details?.c, details?.hs, details?.loc].filter(Boolean).join(" · ")}
    >
      {label || "·"}
      {details?.c && <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-blue-500 rounded-full" />}
      {details?.hs && <span className="absolute bottom-0 left-0 text-[8px] text-orange-600 font-black">HS</span>}
      {details?.loc && status === "Mi" && (
        <span className="absolute bottom-0 right-0 text-[7px] text-purple-700 truncate max-w-full px-0.5">{details.loc}</span>
      )}
    </td>
  );
}
