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
          <Shield className="w-8 h-8 text-blue-300" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Central de Implantações
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Gestão de implantação ERP Centi — Apoio à Liderança
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-sm rounded-xl sm:px-10 border border-slate-200">
          {error && (
            <div
              role="alert"
              className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-2"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700"
              >
                E-mail institucional
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.nome@centi.com.br"
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-centi-600 focus:ring-centi-600 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-700"
                >
                  Senha de acesso
                </label>
                <a
                  href="/recuperar-senha"
                  className="text-xs text-centi-700 hover:text-centi-800 hover:underline"
                >
                  Esqueceu a senha?
                </a>
              </div>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
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
              Contas de Demonstração / Teste
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
                onClick={() => handleFillDemo("roberto.secretario@saopatricio.go.gov.br", "Centi@123456")}
                className="p-2 text-left rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
              >
                <div className="font-medium text-slate-800">Roberto (Município)</div>
                <div className="text-slate-500 text-[11px]">Sec. Administração</div>
              </button>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          Ferramenta de apoio gerencial à NOP 001/2026 da Centi Soluções.
        </p>
      </div>
    </div>
  );
}
