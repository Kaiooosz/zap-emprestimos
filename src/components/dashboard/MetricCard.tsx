"use client";

interface MetricCardProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  accent?: "blue" | "silver" | "danger" | "default";
}

const accents = {
  blue:    { icon: "bg-blue-100 text-blue-700", value: "text-blue-800" },
  silver:  { icon: "bg-slate-100 text-slate-500", value: "text-slate-700" },
  danger:  { icon: "bg-red-50 text-red-600",     value: "text-red-600" },
  default: { icon: "bg-slate-100 text-slate-500", value: "text-slate-900" },
};

export function MetricCard({ label, value, icon, accent = "default" }: MetricCardProps) {
  const s = accents[accent];
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {icon && (
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.icon}`}>
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className={`mt-0.5 text-xl font-bold leading-tight truncate ${s.value}`}>{value}</p>
      </div>
    </div>
  );
}
