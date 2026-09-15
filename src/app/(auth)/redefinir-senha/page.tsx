"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, CheckCircle2, AlertCircle, ArrowLeft, ShieldCheck } from "lucide-react";
import { resetPasswordAction } from "@/lib/actions/auth-actions";

function RedefinirSenhaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Token de redefinição ausente ou inválido.");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve conter no mínimo 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas informadas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      await resetPasswordAction(token, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Falha ao redefinir a senha. O link pode ter expirado.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">Link de redefinição inválido</p>
            <p className="mt-1 text-xs text-amber-800">
              Nenhum token de segurança foi identificado na URL. Solicite um novo link de recuperação.
            </p>
          </div>
        </div>
        <Link
          href="/recuperar-senha"
          className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Solicitar novo link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">Senha alterada com sucesso!</p>
            <p className="mt-1 text-xs text-emerald-800">
              Sua nova credencial foi registrada com segurança. Você já pode autenticar na Central de Implantações.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push("/login")}
          className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-centi-600 hover:bg-centi-700 transition-colors"
        >
          Ir para a tela de Login
        </button>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label htmlFor="pass" className="block text-sm font-medium text-slate-700">
          Nova Senha
        </label>
        <div className="mt-1">
          <input
            id="pass"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-centi-500 focus:border-centi-500 sm:text-sm"
          />
        </div>
      </div>

      <div>
        <label htmlFor="confirmPass" className="block text-sm font-medium text-slate-700">
          Confirmar Nova Senha
        </label>
        <div className="mt-1">
          <input
            id="confirmPass"
            type="password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repita a nova senha"
            className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-centi-500 focus:border-centi-500 sm:text-sm"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-centi-600 hover:bg-centi-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-centi-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          "Salvar Nova Senha"
        )}
      </button>

      <div className="text-center pt-2">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar para o Login
        </Link>
      </div>
    </form>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-centi-900 text-white shadow-md mb-4">
          <KeyRound className="w-8 h-8 text-emerald-300" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Redefinir Senha
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Crie uma nova senha de acesso à Central de Implantações.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-sm rounded-xl sm:px-10 border border-slate-200">
          <Suspense
            fallback={
              <div className="flex justify-center p-8">
                <div className="w-6 h-6 border-2 border-centi-600 border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <RedefinirSenhaForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
