import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  HelpCircle,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Briefcase,
  Users,
  ArrowRightLeft,
  FileText,
  Layers,
} from "lucide-react";
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
      // 1. Status Operacional de Departamentos
      case "OPERACIONAL":
        return {
          label: "Operacional",
          bg: "bg-centi-100 border-centi-300 text-centi-900 font-semibold",
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-centi-600" />,
        };
      case "OPERACAO_ASSISTIDA":
        return {
          label: "Operação Assistida",
          bg: "bg-olive-100 border-olive-300 text-olive-900 font-semibold",
          icon: <Clock className="w-3.5 h-3.5 text-olive-700" />,
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
        return {
          label: "Não Avaliado",
          bg: "bg-slate-100 border-slate-200 text-slate-700",
          icon: <HelpCircle className="w-3.5 h-3.5 text-slate-500" />,
        };

      // 2. Papéis Formais da Equipe Técnica (UserRole)
      case "LIDER_PROJETO":
        return {
          label: "Líder de Implantação",
          bg: "bg-centi-100 border-centi-300 text-centi-950 font-semibold",
          icon: <ShieldCheck className="w-3.5 h-3.5 text-centi-700" />,
        };
      case "ANALISTA":
        return {
          label: "Analista de Implantação",
          bg: "bg-blue-50 border-blue-200 text-blue-800 font-medium",
          icon: <UserCheck className="w-3.5 h-3.5 text-blue-600" />,
        };
      case "BA":
        return {
          label: "Business Analyst (BA)",
          bg: "bg-purple-50 border-purple-200 text-purple-800 font-medium",
          icon: <Briefcase className="w-3.5 h-3.5 text-purple-600" />,
        };
      case "QA":
        return {
          label: "QA / Homologador",
          bg: "bg-emerald-50 border-emerald-200 text-emerald-800 font-medium",
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
        };
      case "CRM_BRIDGE":
        return {
          label: "CRM Bridge",
          bg: "bg-amber-50 border-amber-200 text-amber-800 font-medium",
          icon: <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" />,
        };
      case "DC":
        return {
          label: "Diretor de Contas (DC)",
          bg: "bg-indigo-50 border-indigo-200 text-indigo-800 font-medium",
          icon: <Users className="w-3.5 h-3.5 text-indigo-600" />,
        };
      case "ADMIN_GERAL":
        return {
          label: "Administrador Geral",
          bg: "bg-rose-50 border-rose-200 text-rose-800 font-medium",
          icon: <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />,
        };
      case "LEITOR":
        return {
          label: "Leitor / Consulta",
          bg: "bg-slate-50 border-slate-200 text-slate-700 font-medium",
          icon: <Users className="w-3.5 h-3.5 text-slate-500" />,
        };

      // 3. Fases e Status de Projeto
      case "PLANEJAMENTO":
        return {
          label: "Planejamento",
          bg: "bg-sky-50 border-sky-200 text-sky-800",
          icon: <Clock className="w-3.5 h-3.5 text-sky-600" />,
        };
      case "EXECUCAO":
        return {
          label: "Execução",
          bg: "bg-centi-50 border-centi-300 text-centi-900 font-semibold",
          icon: <Layers className="w-3.5 h-3.5 text-centi-700" />,
        };
      case "ESTABILIZACAO":
        return {
          label: "Estabilização",
          bg: "bg-teal-50 border-teal-200 text-teal-800",
          icon: <Clock className="w-3.5 h-3.5 text-teal-600" />,
        };
      case "PRONTO_TRANSICAO":
        return {
          label: "Pronto Transição",
          bg: "bg-indigo-50 border-indigo-200 text-indigo-800 font-medium",
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />,
        };
      case "EM_TRANSICAO":
        return {
          label: "Em Transição",
          bg: "bg-amber-50 border-amber-200 text-amber-800",
          icon: <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" />,
        };
      case "ENCERRADO":
      case "CONCLUIDA":
        return {
          label: "Concluído",
          bg: "bg-emerald-50 border-emerald-200 text-emerald-800",
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
        };
      case "CANCELADO":
        return {
          label: "Cancelado",
          bg: "bg-slate-100 border-slate-300 text-slate-600",
          icon: <XCircle className="w-3.5 h-3.5 text-slate-500" />,
        };
      case "SUSPENSO":
        return {
          label: "Suspenso",
          bg: "bg-rose-50 border-rose-200 text-rose-700",
          icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />,
        };

      // 4. Criticidade e Prioridade
      case "CRITICA":
        return {
          label: "Crítica",
          bg: "bg-red-100 border-red-300 text-red-900 font-bold",
          icon: <AlertTriangle className="w-3.5 h-3.5 text-red-600" />,
        };
      case "ALTA":
        return {
          label: "Alta",
          bg: "bg-amber-50 border-amber-300 text-amber-900 font-semibold",
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
        };
      case "MEDIA":
        return {
          label: "Média",
          bg: "bg-blue-50 border-blue-200 text-blue-800",
          icon: <Clock className="w-3.5 h-3.5 text-blue-500" />,
        };
      case "BAIXA":
        return {
          label: "Baixa",
          bg: "bg-slate-50 border-slate-200 text-slate-700",
          icon: <Clock className="w-3.5 h-3.5 text-slate-400" />,
        };

      // 5. Documentos e Atas
      case "ATA":
        return {
          label: "Ata de Reunião",
          bg: "bg-purple-50 border-purple-200 text-purple-800",
          icon: <FileText className="w-3.5 h-3.5 text-purple-600" />,
        };
      case "TERMO_ABERTURA":
        return {
          label: "Termo de Abertura",
          bg: "bg-blue-50 border-blue-200 text-blue-800",
          icon: <FileText className="w-3.5 h-3.5 text-blue-600" />,
        };

      default:
        return {
          label: status ? String(status).replace(/_/g, " ") : "N/D",
          bg: "bg-slate-50 border-slate-200 text-slate-700",
          icon: <HelpCircle className="w-3.5 h-3.5 text-slate-400" />,
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
