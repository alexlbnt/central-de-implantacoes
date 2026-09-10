import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/server-session";
import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import {
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Plus,
  Scale,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  Search,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default async function WikiRegrasPage({
  searchParams,
}: {
  searchParams?: Promise<{ projectId?: string; category?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;

  const project = await prisma.project.findFirst({
    where: params?.projectId ? { id: params.projectId } : {},
    include: {
      municipality: true,
      rules: {
        where: params?.category ? { category: params.category } : {},
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!project) {
    return <div className="p-8 text-center text-slate-600">Nenhum projeto encontrado.</div>;
  }

  // Server Action: Criar Regra Municipal
  async function createRuleAction(formData: FormData) {
    "use server";
    const title = formData.get("title") as string;
    const category = formData.get("category") as string;
    const departmentCode = formData.get("departmentCode") as string;
    const informantName = formData.get("informantName") as string;
    const clientVerbalText = formData.get("clientVerbalText") as string;
    const technicalOpinion = formData.get("technicalOpinion") as string;

    if (!title || !clientVerbalText) return;

    await prisma.businessRuleVersion.create({
      data: {
        projectId: project!.id,
        title,
        category: category || "PARTICULARIDADE_MUNICIPAL",
        departmentCode,
        informantName,
        clientVerbalText,
        technicalOpinion,
        status: technicalOpinion ? "EM_VALIDACAO" : "RASCUNHO",
      },
    });

    revalidatePath("/wiki");
  }

  // Server Action: Validar Regra pelo Líder Centi
  async function validateRuleAction(formData: FormData) {
    "use server";
    const ruleId = formData.get("ruleId") as string;
    const status = formData.get("status") as "VALIDADA" | "SUBSTITUIDA_ARQUIVADA";

    await prisma.businessRuleVersion.update({
      where: { id: ruleId },
      data: {
        status,
        validatorName: user?.name || "Líder de Implantação",
        effectiveDate: status === "VALIDADA" ? new Date() : undefined,
      },
    });

    revalidatePath("/wiki");
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Regras de Negócio e Particularidades do Município
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Projeto: <strong>{project.name}</strong>  |  Separação rigorosa entre relato verbal do cliente e parecer técnico da Centi
          </p>
        </div>
      </div>

      {/* Grid: Regras & Nova Regra */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Regras */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-centi-800" />
                Catálogo de Regras e Interpretações Locais
              </h2>
              <span className="text-xs text-slate-500">{project.rules.length} regra(s)</span>
            </div>

            <div className="space-y-4">
              {project.rules.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center">
                  Nenhuma particularidade municipal registrada para este projeto.
                </p>
              ) : (
                project.rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">{rule.title}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-slate-100 text-slate-700">
                            {rule.category}
                          </span>
                          {rule.departmentCode && (
                            <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-blue-50 text-blue-700">
                              {rule.departmentCode}
                            </span>
                          )}
                        </div>
                        {rule.informantName && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Informado verbalmente por: <strong>{rule.informantName}</strong>
                          </div>
                        )}
                      </div>
                      <StatusBadge status={rule.status} />
                    </div>

                    {/* Relato Verbal (Amarelo) vs Parecer Técnico (Azul) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {/* Bloco 1: Relato Verbal */}
                      <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200/80 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-amber-900 text-[11px]">
                          <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                          Relato Verbal do Município (Não validado)
                        </div>
                        <p className="text-slate-800 text-[11px] leading-relaxed whitespace-pre-wrap">
                          {rule.clientVerbalText}
                        </p>
                      </div>

                      {/* Bloco 2: Parecer Técnico Centi */}
                      <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200/80 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-blue-900 text-[11px]">
                          <Scale className="w-3.5 h-3.5 text-blue-700" />
                          Parecer Técnico Centi & Base Legal
                        </div>
                        {rule.technicalOpinion ? (
                          <p className="text-slate-800 text-[11px] leading-relaxed whitespace-pre-wrap">
                            {rule.technicalOpinion}
                          </p>
                        ) : (
                          <p className="text-slate-400 italic text-[11px]">
                            Aguardando parecer do Business Analyst / Líder.
                          </p>
                        )}
                        {rule.validatorName && (
                          <div className="text-[10px] text-blue-700 pt-1 font-medium">
                            Homologado por: {rule.validatorName}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ações do Líder para Validação */}
                    {rule.status !== "VALIDADA" && (
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        <form action={validateRuleAction}>
                          <input type="hidden" name="ruleId" value={rule.id} />
                          <input type="hidden" name="status" value="VALIDADA" />
                          <button
                            type="submit"
                            className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold shadow-2xs"
                          >
                            ✓ Validar e Homologar Regra
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Form para Adicionar Nova Regra */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Plus className="w-4 h-4 text-centi-800" />
            Cadastrar Particularidade Municipal
          </h2>

          <form action={createRuleAction} className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Título da Particularidade</label>
              <input
                type="text"
                name="title"
                required
                placeholder="Ex: Gratificação por Tempo de Serviço (Quinquênio)"
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Categoria</label>
              <select name="category" className="w-full p-2 border border-slate-300 rounded-lg text-xs">
                <option value="PARTICULARIDADE_MUNICIPAL">Particularidade Municipal</option>
                <option value="CALCULO">Cálculo Específico (Folha/Tributos)</option>
                <option value="MIGRACAO">Regra de Migração de Dados</option>
                <option value="ROTINA">Rotina Operacional Local</option>
                <option value="ACORDO_OPERACIONAL">Acordo Operacional</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Sigla / Setor</label>
              <input
                type="text"
                name="departmentCode"
                placeholder="Ex: RH / TRIBUTOS / CONTABILIDADE"
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Servidor Municipal Informante</label>
              <input
                type="text"
                name="informantName"
                placeholder="Ex: Carlos (Chefe de RH)"
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-medium text-amber-900 mb-1">
                Relato Verbal do Cliente (Como o município diz que funciona)
              </label>
              <textarea
                name="clientVerbalText"
                required
                rows={3}
                placeholder="Transcrever exatamente o que o servidor municipal alegou..."
                className="w-full p-2 border border-amber-300 bg-amber-50/40 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-medium text-blue-900 mb-1">
                Parecer Técnico Centi & Base Legal (Lei Municipal / Padrão Centi)
              </label>
              <textarea
                name="technicalOpinion"
                rows={3}
                placeholder="Artigo da Lei, viabilidade no ERP, impacto em parametrização..."
                className="w-full p-2 border border-blue-300 bg-blue-50/40 rounded-lg text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-centi-800 hover:bg-centi-900 text-white rounded-lg font-bold shadow-xs"
            >
              Registrar na Base de Conhecimento
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
