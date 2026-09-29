"use client";

import React, { useState, useTransition } from "react";
import { Plus, X, BookOpen, AlertCircle, CheckCircle2, Calendar, Building2 } from "lucide-react";

interface DepartmentOption {
  id: string;
  name: string;
}

interface NewDiaryEntryModalProps {
  departments: DepartmentOption[];
  createAction: (formData: FormData) => Promise<void>;
}

export function NewDiaryEntryModal({ departments, createAction }: NewDiaryEntryModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        await createAction(formData);
        form.reset();
        setIsOpen(false);
      } catch (err: any) {
        setErrorMsg(err?.message || "Erro ao salvar apontamento no diário.");
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-centi-800 text-white rounded-lg text-xs font-semibold hover:bg-centi-900 transition-colors shadow-xs"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Novo Apontamento</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-centi-100 text-centi-800">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Novo Apontamento de Campo</h3>
                  <p className="text-xs text-slate-500">
                    Registro de atividades realizadas e evidências operacionais do dia
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error banner */}
            {errorMsg && (
              <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-800">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Data da Atividade <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="entryDate"
                    required
                    defaultValue={new Date().toISOString().split("T")[0]}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-centi-800"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    Departamento / Setor
                  </label>
                  <select
                    name="departmentId"
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-centi-800"
                  >
                    <option value="">Geral / Sem setor específico</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Atividade Realizada <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="activity"
                  required
                  placeholder="Ex: Treinamento e conciliação da folha de pagamento..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-centi-800"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Conteúdo Trabalhado e Procedimentos <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="workedContent"
                  required
                  rows={3}
                  placeholder="Descreva de forma clara os procedimentos executados e sistemas acessados..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-centi-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Resultado Observado</label>
                  <textarea
                    name="resultObserved"
                    rows={2}
                    placeholder="O que funcionou com êxito..."
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-centi-800"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Achados / Dificuldades</label>
                  <textarea
                    name="findings"
                    rows={2}
                    placeholder="Resistências, inconsistências em dados..."
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-centi-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Próximos Passos</label>
                <textarea
                  name="nextSteps"
                  rows={2}
                  placeholder="Ações pactuadas com a equipe local..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-centi-800"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                    <input type="checkbox" name="isInternal" value="true" className="rounded border-slate-300 text-centi-800 focus:ring-centi-800" />
                    <span>Anotação interna da Centi</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                    <input type="checkbox" name="publishNow" value="true" defaultChecked className="rounded border-slate-300 text-centi-800 focus:ring-centi-800" />
                    <span className="font-semibold text-slate-800">Publicar imediatamente</span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    disabled={isPending}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-2 bg-centi-800 hover:bg-centi-900 text-white rounded-lg font-bold transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    {isPending ? "Salvando..." : "Salvar Apontamento"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
