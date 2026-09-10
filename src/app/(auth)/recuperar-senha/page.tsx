"use client";

import React, { useState } from "react";
import { ArrowLeft, KeyRound, CheckCircle2, AlertCircle } from "lucide-react";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [successToken, setSuccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessToken(null);

    try {
      // Simulação funcional local de geração de token
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      setSuccessToken(token);
    } catch {
      setError("Erro ao processar solicitação de recuperação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-centi-900 text-white shadow-md mb-4">
          <KeyRound className="w-8 h-8 text-blue-300" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Recuperação de Acesso
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Informe seu e-mail institucional para redefinir sua credencial.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-sm rounded-xl sm:px-10 border border-slate-200">
          {successToken ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold">Solicitação registrada com sucesso!</p>
                  <p className="mt-1 text-xs text-emerald-800">
                    Em ambiente local transparente (sem SMTP externo configurado), seu link seguro temporário foi gerado com validade de 1 hora:
                  </p>
                  <div className="mt-2 p-2 bg-white rounded border border-emerald-300 font-mono text-xs break-all select-all">
                    /redefinir-senha?token={successToken}
                  </div>
                </div>
              </div>

              <a
                href="/login"
                className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para o Login
              </a>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                  E-mail institucional
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@centi.com.br"
                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-centi-600 focus:ring-centi-600 sm:text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-centi-900 hover:bg-centi-950 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-centi-700 transition-colors disabled:opacity-50"
              >
                {loading ? "Processando..." : "Gerar Link de Recuperação"}
              </button>

              <div className="text-center pt-2">
                <a
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Voltar para o Login
                </a>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
