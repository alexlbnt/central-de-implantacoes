"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LogIn, AlertCircle, CheckCircle2, Shield } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError(res.error || "Falha na autenticação. Verifique suas credenciais.");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Erro inesperado ao tentar autenticar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-centi-900 text-white shadow-md mb-4">
          <Shield className="w-8 h-8 text-emerald-300" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Central de Implantações
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Governança Operacional e Metodologia Centi (NOP 001/2026)
        </p>
        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-800">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          <span>Uso Interno Exclusivo: Equipe Técnica Centi</span>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-sm sm:rounded-xl sm:px-10 border border-slate-200">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                E-mail Corporativo (@centi.com.br)
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.nome@centi.com.br"
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-centi-600 focus:ring-centi-600 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Senha de Acesso
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-centi-600 focus:ring-centi-600 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-centi-900 hover:bg-centi-950 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-centi-700 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <span>Autenticando...</span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Entrar no Sistema</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Atalhos Rápidos para Demonstração */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Acesso Rápido (Perfis Centi Homologados)
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleFillDemo("alexandre.lider@centi.com.br", "Centi@123456")}
                className="p-2 text-left rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
              >
                <div className="font-medium text-slate-800">Líder Alexandre</div>
                <div className="text-slate-500 text-[11px]">Líder de Implantação</div>
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo("admin@centi.com.br", "Admin@Centi2026")}
                className="p-2 text-left rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
              >
                <div className="font-medium text-slate-800">Administrador PMO</div>
                <div className="text-slate-500 text-[11px]">Gestão Geral</div>
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo("bruno.analista@centi.com.br", "Centi@123456")}
                className="p-2 text-left rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
              >
                <div className="font-medium text-slate-800">Analista Bruno</div>
                <div className="text-slate-500 text-[11px]">Equipe de Campo</div>
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo("carlos.ba@centi.com.br", "Centi@123456")}
                className="p-2 text-left rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
              >
                <div className="font-medium text-slate-800">Carlos (BA)</div>
                <div className="text-slate-500 text-[11px]">Business Analyst</div>
              </button>
            </div>
            <p className="mt-3 text-[11px] text-slate-400 text-center italic">
              Clientes e servidores da prefeitura não possuem usuário nem acesso à Central.
            </p>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          Ferramenta de apoio gerencial à NOP 001/2026 da Centi Soluções.
        </p>
      </div>
    </div>
  );
}
