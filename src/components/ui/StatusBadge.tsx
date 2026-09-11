import React from "react";
import { CheckCircle2, AlertTriangle, Clock, XCircle, HelpCircle, RefreshCw } from "lucide-react";
import { DepartmentStatus } from "@prisma/client";

interface StatusBadgeProps {
  status: DepartmentStatus | string;
  revalidationRequired?: boolean;
  className?: string;
  showIcon?: boolean;
}

export function StatusBadge({
  status,
  revalidationRequired = false,
  className = "",
  showIcon = true,
}: StatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "OPERACIONAL":
        return {
          label: "Operacional",
          bg: "bg-emerald-50 border-emerald-200 text-emerald-800",
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
        };
      case "OPERACAO_ASSISTIDA":
        return {
          label: "Operação Assistida",
          bg: "bg-teal-50 border-teal-200 text-teal-800",
          icon: <Clock className="w-3.5 h-3.5 text-teal-600" />,
        };
      case "EM_PREPARACAO":
        return {
          label: "Em Preparação",
          bg: "bg-amber-50 border-amber-200 text-amber-800",
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
        };
      case "BLOQUEADO":
        return {
          label: "Bloqueado",
          bg: "bg-red-50 border-red-200 text-red-800",
          icon: <XCircle className="w-3.5 h-3.5 text-red-600" />,
        };
      case "NAO_AVALIADO":
      default:
        return {
          label: "Não Avaliado",
          bg: "bg-slate-100 border-slate-200 text-slate-700",
          icon: <HelpCircle className="w-3.5 h-3.5 text-slate-500" />,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg}`}
      >
        {showIcon && config.icon}
        <span>{config.label}</span>
      </span>

      {revalidationRequired && (
        <span
          title="Revalidação necessária: teste expirou (> 7 dias) ou diagnóstico defasado (> 2 dias úteis)"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 border border-orange-300 text-orange-900"
        >
          <RefreshCw className="w-3 h-3 text-orange-700" />
          <span>Revalidação</span>
        </span>
      )}
    </div>
  );
}
