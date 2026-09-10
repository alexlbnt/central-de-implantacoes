import Link from "next/link";
import { AlertTriangle, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-6 text-center">
      <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Página não encontrada</h1>
      <p className="text-slate-600 max-w-md mb-6">
        O recurso ou rota solicitada não existe ou foi movida na Central de Implantações.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-centi-900 text-white font-medium rounded-lg hover:bg-centi-950 transition-colors shadow-sm"
      >
        <Home className="w-4 h-4" />
        <span>Voltar ao Início</span>
      </Link>
    </div>
  );
}
