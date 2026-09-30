import React from "react";
import Link from "next/link";
import { Building2, ArrowLeft, Home } from "lucide-react";

export default function DashboardNotFound() {
  return (
    <div className="min-h-[55vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-4">
        <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
          <Building2 className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-slate-900">
            Recurso Não Encontrado
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            O departamento, projeto ou registro que você tentou acessar não foi localizado ou o endereço acessado contém um identificador incorreto.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-3">
          <Link
            href="/departamentos"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-centi-800 hover:bg-centi-900 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Ver Departamentos</span>
          </Link>

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
