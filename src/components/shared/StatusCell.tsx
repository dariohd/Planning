import { STATUS_BG, STATUS_LABELS } from "@/lib/constants";

type Props = {
  status: string;
  className?: string;
  onClick?: () => void;
};

export function StatusCell({ status, className = "", onClick }: Props) {
  const bg = STATUS_BG[status] ?? "bg-white text-slate-700";
  const label = STATUS_LABELS[status] ?? status;

  return (
    <td
      className={`border border-slate-300 text-center text-xs font-bold p-1 ${bg} ${className} ${onClick ? "cursor-pointer hover:opacity-80" : ""}`}
      onClick={onClick}
      title={status}
    >
      {label || "·"}
    </td>
  );
}
