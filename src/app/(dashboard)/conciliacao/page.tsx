import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/server-session";
import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import {
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ArrowUpRight,
  FileCheck,
  Sparkles,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { generateTK059CopyPackage, evaluateReconciliationStatus } from "@/lib/domain/tk059-mapper";

export default async function ConciliacaoTK059Page({
  searchParams,
}: {
  searchParams?: Promise<{ projectId?: string; selectedRefId?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;

  const project = await prisma.project.findFirst({
    where: params?.projectId ? { id: params.projectId } : {},
    include: {
      municipality: true,
      officialRefs: {
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!project) {
    return <div className="p-8 text-center text-slate-600">Nenhum projeto encontrado.</div>;
  }

  // Prepara itens avaliando divergência de versão
  const references = project.officialRefs.map((ref) => {
    const evaluatedStatus = evaluateReconciliationStatus(
      ref.status as any,
      ref.localVersionCovered,
      ref.localVersionCovered
    );
    return {
      ...ref,
      evaluatedStatus,
    };
  });

  const selectedRef = references.find((r) => r.id === params?.selectedRefId) || references[0];

  // Gera o pacote de cópia se houver item selecionado
  const copyPackageText = selectedRef
    ? generateTK059CopyPackage({
        id: selectedRef.id,
        projectId: project.id,
        sourceType: "OfficialReference",
        sourceTitle: selectedRef.identifier,
        system: selectedRef.system as any,
        destinationTab: (selectedRef.destinationTab as any) || "Observacao",
        identifier: selectedRef.identifier,
        currentLocalVersion: selectedRef.localVersionCovered,
        coveredLocalVersion: selectedRef.localVersionCovered,
        status: selectedRef.evaluatedStatus as any,
        summaryText: `Status de Implantação e Homologação registrado na Central Centi.\nIdentificador: ${selectedRef.identifier}\nÚltima verificação: ${selectedRef.lastCheckedAt ? new Date(selectedRef.lastCheckedAt).toLocaleDateString("pt-BR") : "Pendente"}\nResponsável: ${selectedRef.checkedBy || "Líder de Implantação"}`,
      })
    : "";

  // Server Action: Criar Referência Oficial
  async function createReferenceAction(formData: FormData) {
    "use server";
    const system = formData.get("system") as any;
    const identifier = formData.get("identifier") as string;
    const destinationTab = formData.get("destinationTab") as string;
    const url = formData.get("url") as string;

    if (!identifier) return;

    await prisma.officialReference.create({
      data: {
        projectId: project!.id,
        system: system || "TK059_OBSERVACAO",
        identifier,
        destinationTab: destinationTab || "Observacao",
        url,
        status: "PREPARADO_PARA_REGISTRO",
      },
    });

    revalidatePath("/conciliacao");
  }

  // Server Action: Declarar Registro Manual no #TK059
  async function declareManualRegistrationAction(formData: FormData) {
    "use server";
    const refId = formData.get("refId") as string;

    await prisma.officialReference.update({
      where: { id: refId },
      data: {
        status: "REGISTRO_MANUAL_DECLARADO",
        lastCheckedAt: new Date(),
        checkedBy: user?.name || "Líder de Implantação",
      },
    });

    revalidatePath("/conciliacao");
  }

  // Server Action: Homologar / Conferir Registro
  async function conferRegistrationAction(formData: FormData) {
    "use server";
    const refId = formData.get("refId") as string;

    await prisma.officialReference.update({
      where: { id: refId },
      data: {
        status: "CONFERIDO",
        lastCheckedAt: new Date(),
        checkedBy: user?.name || "Líder de Implantação",
      },
    });

    revalidatePath("/conciliacao");
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Registros Oficiais e Conciliação com o Chamado #TK059
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Projeto: <strong>{project.name}</strong>  |  Sincronismo fidedigno com os canais oficiais corporativos
          </p>
        </div>
      </div>

      {/* Banner de Fonte Única da Verdade */}
      <div className="p-4 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 space-y-1.5 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          CLÁUSULA DE FONTE ÚNICA DA VERDADE (NOP 001/2026)
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          O chamado <strong>#TK059</strong> (e chamados correlatos <strong>#TK090</strong> e <strong>#TK102</strong>) constitui a <strong>única fonte oficial de verdade contratual</strong> da Centi Soluções.
          Esta Central de Implantações funciona exclusivamente como apoio tático e gerencial. Atualizações contratuais devem ser registradas manualmente no chamado oficial utilizando o gerador de despacho abaixo.
        </p>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Registros Mapeados</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{references.length}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Conferidos Oficialmente</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            {references.filter((r) => r.status === "CONFERIDO").length}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Registro Manual Declarado</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            {references.filter((r) => r.status === "REGISTRO_MANUAL_DECLARADO").length}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Divergências Identificadas</div>
          <div className="text-2xl font-bold text-red-600 mt-1">
            {references.filter((r) => r.status === "DIVERGENCIA_IDENTIFICADA").length}
          </div>
        </div>
      </div>

      {/* Grid: Lista de Referências & Gerador de Despacho */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabela de Referências Oficiais */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-centi-800" />
              Tabela de Conciliação com Sistemas Oficiais
            </h2>
            <span className="text-xs text-slate-500">{references.length} item(ns)</span>
          </div>

          <div className="space-y-3">
            {references.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">
                Nenhum vínculo a chamados oficiais cadastrado ainda.
              </p>
            ) : (
              references.map((ref) => {
                const isSelected = ref.id === selectedRef?.id;

                return (
                  <div
                    key={ref.id}
                    className={`p-3.5 rounded-lg border transition-all ${
                      isSelected
                        ? "border-centi-600 bg-emerald-50/40 ring-1 ring-centi-600"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">{ref.identifier}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-slate-100 text-slate-700">
                            {ref.system}
                          </span>
                          {ref.destinationTab && (
                            <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-50 text-emerald-700">
                              Aba: {ref.destinationTab}
                            </span>
                          )}
                          <StatusBadge status={ref.status} />
                        </div>

                        <div className="text-[11px] text-slate-500 mt-1">
                          Última conferência: {ref.lastCheckedAt ? new Date(ref.lastCheckedAt).toLocaleDateString("pt-BR") : "Nunca"} • Responsável: {ref.checkedBy || "Pendente"}
                        </div>
                      </div>

                      <Link
                        href={`/conciliacao?projectId=${project.id}&selectedRefId=${ref.id}`}
                        className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                          isSelected
                            ? "bg-centi-800 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        Gerar Despacho
                      </Link>
                    </div>

                    {/* Ações de Conciliação */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
                      {ref.status !== "REGISTRO_MANUAL_DECLARADO" && (
                        <form action={declareManualRegistrationAction}>
                          <input type="hidden" name="refId" value={ref.id} />
                          <button
                            type="submit"
                            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-bold shadow-2xs"
                          >
                            Declarar Registro Efetuado
                          </button>
                        </form>
                      )}

                      {ref.status !== "CONFERIDO" && (
                        <form action={conferRegistrationAction}>
                          <input type="hidden" name="refId" value={ref.id} />
                          <button
                            type="submit"
                            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-bold shadow-2xs"
                          >
                            ✓ Conferir e Homologar
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Coluna 3: Gerador de Pacote de Cópia & Cadastro */}
        <div className="space-y-4">
          {/* Caixa de Texto Copiável */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Copy className="w-4 h-4 text-centi-800" />
                Despacho para o #TK059
              </h2>
            </div>

            {selectedRef ? (
              <div className="space-y-3 text-xs">
                <p className="text-slate-500 text-[11px]">
                  Copie o texto estruturado abaixo e cole diretamente na aba <strong>{selectedRef.destinationTab || "Observações"}</strong> do chamado oficial.
                </p>

                <textarea
                  readOnly
                  rows={10}
                  value={copyPackageText}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-[11px] text-slate-800 select-all"
                />

                <div className="text-[10px] text-slate-400 italic">
                  * Clique no quadro e pressione Ctrl+A e Ctrl+C para copiar instantaneamente.
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">
                Selecione um registro na lista ao lado para gerar o despacho.
              </p>
            )}
          </div>

          {/* Form para Adicionar Nova Referência */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
              <Plus className="w-4 h-4 text-centi-800" />
              Vincular Chamado Oficial
            </h2>

            <form action={createReferenceAction} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Sistema / Chamado</label>
                <select name="system" className="w-full p-2 border border-slate-300 rounded-lg text-xs">
                  <option value="TK059_OBSERVACAO">#TK059 - Observação Geral</option>
                  <option value="TK059_MODULOS">#TK059 - Aba Módulos</option>
                  <option value="TK059_TICKET">#TK059 - Ticket Principal</option>
                  <option value="TK059_DOCUMENTO">#TK059 - Aba Documentos</option>
                  <option value="TK059_CHECKLIST">#TK059 - Aba Checklist</option>
                  <option value="TK090">#TK090 - Intervenção Técnica / GPH</option>
                  <option value="TK102">#TK102 - Homologação Final</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Identificador</label>
                <input
                  type="text"
                  name="identifier"
                  required
                  placeholder="Ex: #TK059-MOD-RH-01"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Aba de Destino</label>
                <input
                  type="text"
                  name="destinationTab"
                  defaultValue="Observacao"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Link do Chamado (Opcional)</label>
                <input
                  type="url"
                  name="url"
                  placeholder="https://desk.centi.com.br/tickets/..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-centi-800 hover:bg-centi-900 text-white rounded-lg font-bold shadow-xs"
              >
                Cadastrar Vínculo
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
