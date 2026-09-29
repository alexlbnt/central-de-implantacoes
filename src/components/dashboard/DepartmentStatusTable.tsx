"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Search, ShieldAlert, CheckCircle2, Building2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";

export interface DepartmentRowData {
  id: string;
  name: string;
  entityName: string;
  operationalStatus: "BLOQUEADO" | "NAO_AVALIADO" | "EM_PREPARACAO" | "OPERACAO_ASSISTIDA" | "OPERACIONAL";
  revalidationRequired?: boolean;
  deliverableProgressText: string;
  autonomyProgressText: string;
  analistaName: string;
  municipalName: string;
  blockerTitle?: string | null;
  lastDiagnosisNote?: string | null;
}

interface DepartmentStatusTableProps {
  departments: DepartmentRowData[];
}

export function DepartmentStatusTable({ departments }: DepartmentStatusTableProps) {
  const [filter, setFilter] = useState<"TODOS" | "ATENCAO" | "OPERACIONAIS">("TODOS");
  const [search, setSearch] = useState("");

  const counts = useMemo(() => {
    const atencao = departments.filter(
      (d) => d.operationalStatus === "BLOQUEADO" || d.revalidationRequired || !!d.blockerTitle
    ).length;
    const operacionais = departments.filter((d) => d.operationalStatus === "OPERACIONAL").length;
    return { todos: departments.length, atencao, operacionais };
  }, [departments]);

  const filteredDepartments = useMemo(() => {
    return departments.filter((dept) => {
      const matchesSearch =
        search.trim() === "" ||
        dept.name.toLowerCase().includes(search.toLowerCase()) ||
        dept.entityName.toLowerCase().includes(search.toLowerCase()) ||
        dept.analistaName.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      if (filter === "ATENCAO") {
        return dept.operationalStatus === "BLOQUEADO" || dept.revalidationRequired || !!dept.blockerTitle;
      }
      if (filter === "OPERACIONAIS") {
        return dept.operationalStatus === "OPERACIONAL";
      }
      return true;
    });
  }, [departments, filter, search]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
      {/* Header com Filtros Rápidos */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-centi-800" />
            Situação dos Departamentos
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Visão consolidada de prontidão operacional e bloqueios
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Campo de Busca Rápida */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar setor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-centi-800 w-36 sm:w-44 transition-all"
            />
          </div>

          <Link
            href="/departamentos"
            className="text-xs font-semibold text-centi-800 hover:text-centi-950 inline-flex items-center gap-1 shrink-0 ml-1"
          >
            Ver todos <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Tabs de Filtro */}
      <div className="px-4 py-2 bg-slate-50/60 border-b border-slate-100 flex items-center gap-1.5 text-xs overflow-x-auto">
        <button
          onClick={() => setFilter("TODOS")}
          className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
            filter === "TODOS"
              ? "bg-white text-slate-900 shadow-xs border border-slate-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          Todos ({counts.todos})
        </button>

        <button
          onClick={() => setFilter("ATENCAO")}
          className={`px-2.5 py-1 rounded-md font-medium transition-colors inline-flex items-center gap-1.5 ${
            filter === "ATENCAO"
              ? "bg-red-50 text-red-900 shadow-xs border border-red-200 font-bold"
              : counts.atencao > 0
              ? "text-red-700 hover:bg-red-50"
              : "text-slate-500 hover:bg-slate-100"
          }`}
        >
          {counts.atencao > 0 && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
          Atenção Necessária ({counts.atencao})
        </button>

        <button
          onClick={() => setFilter("OPERACIONAIS")}
          className={`px-2.5 py-1 rounded-md font-medium transition-colors inline-flex items-center gap-1.5 ${
            filter === "OPERACIONAIS"
              ? "bg-centi-50 text-centi-950 shadow-xs border border-centi-200 font-bold"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          Operacionais ({counts.operacionais})
        </button>
      </div>

      {/* Tabela de Dados */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
              <th className="py-2.5 px-3">Departamento & Entidade</th>
              <th className="py-2.5 px-3">Situação</th>
              <th className="py-2.5 px-3">Entregas</th>
              <th className="py-2.5 px-3">Autonomia</th>
              <th className="py-2.5 px-3">Equipe</th>
              <th className="py-2.5 px-3">Impedimento / Diagnóstico</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredDepartments.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  Nenhum setor encontrado para os critérios selecionados.
                </td>
              </tr>
            ) : (
              filteredDepartments.map((dept) => {
                const hasBlocker = !!dept.blockerTitle;
                return (
                  <tr
                    key={dept.id}
                    className={`hover:bg-slate-50/80 transition-colors group cursor-pointer ${
                      hasBlocker ? "bg-red-50/20" : ""
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <Link href={`/departamentos/${dept.id}`} className="block">
                        <div className="font-semibold text-slate-900 group-hover:text-centi-800 transition-colors">
                          {dept.name}
                        </div>
                        <div className="text-[11px] text-slate-500">{dept.entityName}</div>
                      </Link>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <StatusBadge
                        status={dept.operationalStatus}
                        revalidationRequired={dept.revalidationRequired}
                      />
                    </td>

                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                      {dept.deliverableProgressText}
                    </td>

                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                      {dept.autonomyProgressText}
                    </td>

                    <td className="py-2.5 px-3 text-[11px] text-slate-600 whitespace-nowrap">
                      <div><span className="font-medium text-slate-700">Centi:</span> {dept.analistaName}</div>
                      <div><span className="font-medium text-slate-700">Mun:</span> {dept.municipalName}</div>
                    </td>

                    <td className="py-2.5 px-3 text-[11px]">
                      {dept.blockerTitle ? (
                        <span className="text-red-700 font-semibold line-clamp-1 inline-flex items-center gap-1" title={dept.blockerTitle}>
                          <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-red-600" />
                          {dept.blockerTitle}
                        </span>
                      ) : dept.lastDiagnosisNote ? (
                        <span className="text-slate-600 line-clamp-1" title={dept.lastDiagnosisNote}>
                          {dept.lastDiagnosisNote}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Sem impedimentos</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
