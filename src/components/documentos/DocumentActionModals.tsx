"use client";

import React, { useState, useTransition } from "react";
import { Upload, Send, X, Shield, FileCheck, AlertCircle } from "lucide-react";

interface DocOption {
  id: string;
  title: string;
}

interface DocumentActionModalsProps {
  documents: DocOption[];
  uploadAction: (formData: FormData) => Promise<void>;
  formalizationAction: (formData: FormData) => Promise<void>;
}

export function DocumentActionModals({
  documents,
  uploadAction,
  formalizationAction,
}: DocumentActionModalsProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isFormalizeOpen, setIsFormalizeOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleUploadSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        await uploadAction(formData);
        form.reset();
        setIsUploadOpen(false);
      } catch (err: any) {
        setErrorMsg(err?.message || "Erro ao realizar upload do documento.");
      }
    });
  };

  const handleFormalizeSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        await formalizationAction(formData);
        form.reset();
        setIsFormalizeOpen(false);
      } catch (err: any) {
        setErrorMsg(err?.message || "Erro ao registrar formalização.");
      }
    });
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            setErrorMsg(null);
            setIsFormalizeOpen(true);
          }}
          disabled={documents.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5 text-centi-800" />
          <span>Registrar Formalização</span>
        </button>

        <button
          onClick={() => {
            setErrorMsg(null);
            setIsUploadOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-centi-800 text-white rounded-lg text-xs font-semibold hover:bg-centi-900 transition-colors shadow-xs"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Custodiar Documento</span>
        </button>
      </div>

      {/* Modal: Custodiar Documento (Upload) */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-centi-100 text-centi-800">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Custódia Segura de Documento</h3>
                  <p className="text-xs text-slate-500">Upload protegido com hash criptográfico SHA-256</p>
                </div>
              </div>
              <button
                onClick={() => setIsUploadOpen(false)}
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

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Título do Documento <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  placeholder="Ex: Termo de Homologação Folha de Pagamento"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-centi-800"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Tipo de Documento</label>
                <select
                  name="type"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-centi-800"
                >
                  <option value="TERMO_ABERTURA">Termo de Abertura de Implantação</option>
                  <option value="TERMO_DADOS_LEGADOS">Termo de Recebimento de Dados Legados</option>
                  <option value="CHECKLIST_AUTONOMIA">Checklist de Autonomia Operacional</option>
                  <option value="TESTE_HOMOLOGACAO">Evidência de Teste de Homologação</option>
                  <option value="EVIDENCIA_MIGRACAO">Evidência de Migração e Saneamento</option>
                  <option value="ATA">Ata de Reunião Assinada</option>
                  <option value="PORTAL_TRANSPARENCIA">Validação Portal da Transparência</option>
                  <option value="PNCP">Validação Integração PNCP</option>
                  <option value="ATA_HANDOVER">Ata de Handover (Transição)</option>
                  <option value="OUTRO">Outro Documento</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Arquivo (PDF, DOCX, XLSX, PNG) <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  name="file"
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-slate-50 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-centi-800 file:text-white"
                />
                <p className="text-[11px] text-slate-400 mt-1">Limite: 20 MB. O arquivo será assinado criptograficamente.</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
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
                  {isPending ? "Armazenando..." : "Custodiar Arquivo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registrar Formalização de Assinatura */}
      {isFormalizeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-centi-100 text-centi-800">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Registrar Formalização de Assinatura</h3>
                  <p className="text-xs text-slate-500">Registro oficial de envio e cobrança aos gestores municipais</p>
                </div>
              </div>
              <button
                onClick={() => setIsFormalizeOpen(false)}
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

            <form onSubmit={handleFormalizeSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Documento Alvo <span className="text-red-500">*</span>
                </label>
                <select
                  name="documentId"
                  required
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-centi-800"
                >
                  <option value="">Selecione o documento...</option>
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Canal de Envio</label>
                  <select
                    name="channel"
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white"
                  >
                    <option value="CENTISIGN">CentiSign</option>
                    <option value="GOV_BR">Gov.br</option>
                    <option value="EMAIL">E-mail Formal</option>
                    <option value="PRESENCIAL">Presencial / Físico</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Método</label>
                  <select
                    name="method"
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white"
                  >
                    <option value="CENTISIGN">Digital (CentiSign)</option>
                    <option value="GOV_BR">Digital (Gov.br)</option>
                    <option value="FISICA">Assinatura Física</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Nome do Destinatário <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="recipientName"
                  required
                  placeholder="Ex: Prefeito Municipal ou Secretário"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
                  <input type="checkbox" name="isSigned" value="true" className="rounded border-slate-300 text-centi-800" />
                  <span>Assinatura já coletada com sucesso</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormalizeOpen(false)}
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
                  {isPending ? "Salvando..." : "Salvar Formalização"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
