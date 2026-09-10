import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  numerator?: number;
  denominator?: number;
  icon?: React.ReactNode;
  href?: string;
  variant?: "default" | "success" | "warning" | "danger";
}

export function MetricCard({
  title,
  value,
  subtitle,
  numerator,
  denominator,
  icon,
  href,
  variant = "default",
}: MetricCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return "border-emerald-200 bg-emerald-50/40 text-emerald-950";
      case "warning":
        return "border-amber-200 bg-amber-50/40 text-amber-950";
      case "danger":
        return "border-red-200 bg-red-50/40 text-red-950";
      case "default":
      default:
        return "border-slate-200 bg-white text-slate-900";
    }
  };

  const content = (
    <div
      className={`p-4 rounded-xl border shadow-sm transition-all hover:shadow-md ${getVariantStyles()} flex flex-col justify-between h-full`}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider line-clamp-1">
            {title}
          </span>
          {icon && <div className="text-slate-400">{icon}</div>}
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-bold tracking-tight">
            {value}
          </span>
          {numerator !== undefined && denominator !== undefined && (
            <span className="text-xs text-slate-500 font-medium">
              ({numerator}/{denominator})
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="line-clamp-1">{subtitle || "Ver detalhes"}</span>
        {href && <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block group focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}
