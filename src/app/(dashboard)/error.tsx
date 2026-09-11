"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log do erro técnico no console para diagnóstico
    console.error("Erro capturado no Dashboard:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-5">
        <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-slate-900">
            Ops! Ocorreu um imprevisto
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            Não foi possível carregar os dados desta tela no momento. Pode ser uma instabilidade temporária de conexão ou uma configuração pendente.
          </p>
        </div>

        {/* Detalhes técnicos para diagnóstico rápido */}
        {error?.digest && (
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-left">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
              Identificador Técnico (Digest):
            </span>
            <code className="text-xs text-slate-700 font-mono block truncate mt-0.5">
              {error.digest}
            </code>
            {error.message && !error.message.includes("digest") && (
              <p className="text-[11px] text-red-600 mt-1 font-mono truncate">
                {error.message}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-centi-800 hover:bg-centi-900 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Tentar Novamente</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Visão Geral</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
