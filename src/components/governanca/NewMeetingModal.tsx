"use client";

import React, { useState, useTransition } from "react";
import { Plus, X, Calendar, Clock, MapPin, User, FileText, AlertCircle } from "lucide-react";

interface NewMeetingModalProps {
  defaultLeaderName?: string;
  createAction: (formData: FormData) => Promise<void>;
}

export function NewMeetingModal({ defaultLeaderName = "Líder de Implantação", createAction }: NewMeetingModalProps) {
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
        setErrorMsg(err?.message || "Erro ao abrir rascunho da ata de governança.");
      }
    });
  };

  return (
    <>
      <button
        onClick={() => {
          setErrorMsg(null);
          setIsOpen(true);
        }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-centi-800 text-white rounded-lg text-xs font-semibold hover:bg-centi-900 transition-colors shadow-xs"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Nova Ata Semanal</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-centi-100 text-centi-800">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Abertura de Ata Semanal</h3>
                  <p className="text-xs text-slate-500">Rito oficial de governança e alinhamento tático</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-800">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Data da Reunião <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="meetingDate"
                  required
                  defaultValue={new Date().toISOString().split("T")[0]}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-centi-800"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Horário (Início às Término)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    name="startTime"
                    defaultValue="09:00"
                    placeholder="09:00"
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white"
                  />
                  <span className="text-slate-400 text-xs">às</span>
                  <input
                    type="text"
                    name="endTime"
                    defaultValue="10:30"
                    placeholder="10:30"
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  Local / Canal
                </label>
                <input
                  type="text"
                  name="location"
                  defaultValue="Prefeitura e Sala Virtual (Teams)"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-centi-800"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Responsável pela Execução
                </label>
                <input
                  type="text"
                  name="executionLeader"
                  defaultValue={defaultLeaderName}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-centi-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
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
                  {isPending ? "Abrindo..." : "Criar Rascunho da Ata"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
