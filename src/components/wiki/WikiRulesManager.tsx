"use client";

import React, { useState, useTransition } from "react";
import {
  BookOpen,
  Plus,
  Scale,
  MessageSquare,
  Building2,
  Pencil,
  Trash2,
  X,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Tag,
  UserCheck,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  createBusinessRuleAction,
  updateBusinessRuleAction,
  validateBusinessRuleAction,
  deleteBusinessRuleAction,
} from "@/lib/actions/rule-actions";

export interface DepartmentOption {
  id: string;
  name: string;
  entityName: string;
}

export interface BusinessRuleItem {
  id: string;
  projectId: string;
  title: string;
  category: string;
  departmentId?: string | null;
  departmentCode?: string | null;
  department?: {
    id: string;
    name: string;
    entity?: {
      name: string;
    } | null;
  } | null;
  clientVerbalText: string;
  technicalOpinion?: string | null;
  status: "RASCUNHO" | "EM_VALIDACAO" | "VALIDADA" | "SUBSTITUIDA_ARQUIVADA" | string;
  informantName?: string | null;
  validatorName?: string | null;
  effectiveDate?: string | Date | null;
  versionNumber: number;
  version: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface WikiRulesManagerProps {
  projectId: string;
  projectName: string;
  rules: BusinessRuleItem[];
  departments: DepartmentOption[];
  isAdminOrLeader?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  PARTICULARIDADE_MUNICIPAL: "Particularidade Municipal",
  CALCULO: "Cálculo Específico (Folha/Tributos)",
  MIGRACAO: "Regra de Migração de Dados",
  ROTINA: "Rotina Operacional Local",
  ACORDO_OPERACIONAL: "Acordo Operacional",
  INTEGRACAO: "Integração Externa",
  PERFIL_USUARIO: "Perfil de Acesso / Governança",
};

export function WikiRulesManager({
  projectId,
  projectName,
  rules,
  departments,
  isAdminOrLeader = false,
}: WikiRulesManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>("TODOS");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("TODOS");

  // Estado do Modal de Edição
  const [editingRule, setEditingRule] = useState<BusinessRuleItem | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [isPendingEdit, startEditTransition] = useTransition();

  // Estado do Formulário de Criação
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [isPendingCreate, startCreateTransition] = useTransition();

  // Estado de Validação / Exclusão
  const [isPendingAction, startActionTransition] = useTransition();
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);

  // Agrupamento de departamentos por Entidade para os selects
  const groupedDepartments = departments.reduce((acc, dept) => {
    const group = dept.entityName || "Município";
    if (!acc[group]) acc[group] = [];
    acc[group].push(dept);
    return acc;
  }, {} as Record<string, DepartmentOption[]>);

  // Filtragem das regras
  const filteredRules = rules.filter((rule) => {
    const matchesSearch =
      searchTerm.trim() === "" ||
      rule.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.clientVerbalText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rule.technicalOpinion && rule.technicalOpinion.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (rule.informantName && rule.informantName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (rule.department?.name && rule.department.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (rule.departmentCode && rule.departmentCode.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesDept =
      selectedDeptFilter === "TODOS" ||
      (selectedDeptFilter === "SEM_DEPARTAMENTO" && !rule.departmentId) ||
      rule.departmentId === selectedDeptFilter;

    const matchesCategory =
      selectedCategoryFilter === "TODOS" || rule.category === selectedCategoryFilter;

    return matchesSearch && matchesDept && matchesCategory;
  });

  // Handler para Salvar Edição
  async function handleSaveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEditError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startEditTransition(async () => {
      try {
        await updateBusinessRuleAction(formData);
        setEditingRule(null);
      } catch (err: unknown) {
        setEditError(err instanceof Error ? err.message : "Erro ao atualizar particularidade.");
      }
    });
  }

  // Handler para Criar Regra
  async function handleCreateRule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startCreateTransition(async () => {
      try {
        await createBusinessRuleAction(formData);
        form.reset();
        setCreateSuccess("Particularidade registrada com sucesso na base!");
        setTimeout(() => setCreateSuccess(null), 4000);
      } catch (err: unknown) {
        setCreateError(err instanceof Error ? err.message : "Erro ao registrar particularidade.");
      }
    });
  }

  // Handler para Homologar / Validar
  function handleValidate(ruleId: string) {
    const formData = new FormData();
    formData.set("ruleId", ruleId);
    formData.set("status", "VALIDADA");

    startActionTransition(async () => {
      try {
        await validateBusinessRuleAction(formData);
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Erro ao validar regra.");
      }
    });
  }

  // Handler para Excluir
  function handleDelete(ruleId: string) {
    if (!confirm("Tem certeza que deseja excluir esta particularidade municipal?")) return;

    const formData = new FormData();
    formData.set("ruleId", ruleId);

    setDeletingRuleId(ruleId);
    startActionTransition(async () => {
      try {
        await deleteBusinessRuleAction(formData);
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Erro ao excluir regra.");
      } finally {
        setDeletingRuleId(null);
      }
    });
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
            Projeto: <strong>{projectName}</strong> | Vínculo direto com Departamentos e separação entre relato verbal e parecer Centi
          </p>
        </div>
      </div>

      {/* Grid Principal: Listagem & Formulário de Cadastro */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal: Filtros e Listagem */}
        <div className="lg:col-span-2 space-y-4">
          {/* Card de Filtros e Busca */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Campo de Busca */}
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por título, informante, relato, parecer ou departamento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-centi-500 focus:bg-white"
                />
              </div>

              {/* Filtro de Departamento */}
              <div className="w-full sm:w-56">
                <select
                  value={selectedDeptFilter}
                  onChange={(e) => setSelectedDeptFilter(e.target.value)}
                  className="w-full py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-centi-500"
                >
                  <option value="TODOS">Todos os Departamentos</option>
                  <option value="SEM_DEPARTAMENTO">Sem departamento (Geral)</option>
                  {Object.entries(groupedDepartments).map(([entityName, depts]) => (
                    <optgroup key={entityName} label={entityName}>
                      {depts.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Filtro de Categoria */}
              <div className="w-full sm:w-48">
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="w-full py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-centi-500"
                >
                  <option value="TODOS">Todas as Categorias</option>
                  {Object.entries(CATEGORY_LABELS).map(([catValue, catLabel]) => (
                    <option key={catValue} value={catValue}>
                      {catLabel}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Listagem de Particularidades */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-centi-800" />
                Catálogo de Particularidades e Regras de Negócio
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                {filteredRules.length} de {rules.length} particularidade(s)
              </span>
            </div>

            <div className="space-y-4">
              {filteredRules.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500 italic">
                    {rules.length === 0
                      ? "Nenhuma particularidade municipal registrada para este projeto."
                      : "Nenhuma particularidade encontrada com os filtros selecionados."}
                  </p>
                </div>
              ) : (
                filteredRules.map((rule) => {
                  const departmentDisplayName = rule.department
                    ? `${rule.department.name}${
                        rule.department.entity?.name ? ` (${rule.department.entity.name})` : ""
                      }`
                    : rule.departmentCode || null;

                  return (
                    <div
                      key={rule.id}
                      className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs hover:border-slate-300 transition-colors"
                    >
                      {/* Linha Superior: Título, Badges e Status */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">{rule.title}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-slate-100 text-slate-700">
                              {CATEGORY_LABELS[rule.category] || rule.category}
                            </span>
                            {departmentDisplayName ? (
                              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <Building2 className="w-3 h-3 text-emerald-600" />
                                {departmentDisplayName}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-semibold bg-slate-50 text-slate-500 border border-slate-200">
                                Geral / Todo o Município
                              </span>
                            )}
                          </div>
                          {rule.informantName && (
                            <div className="text-[11px] text-slate-500">
                              Servidor Informante: <strong>{rule.informantName}</strong>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 self-start">
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                            v{rule.versionNumber || rule.version || 1}
                          </span>
                          <StatusBadge status={rule.status} />
                        </div>
                      </div>

                      {/* Relato Verbal (Amarelo) vs Parecer Técnico (Verde) */}
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
                        <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/80 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-emerald-950 text-[11px]">
                            <Scale className="w-3.5 h-3.5 text-emerald-700" />
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
                            <div className="text-[10px] text-emerald-700 pt-1 font-medium flex items-center gap-1">
                              <UserCheck className="w-3 h-3" />
                              Homologado por: {rule.validatorName}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Barra de Ações: Editar, Homologar e Excluir */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div className="text-[10px] text-slate-400">
                          Atualizado em: {new Date(rule.updatedAt).toLocaleDateString("pt-BR")}
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Botão de Edição */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditError(null);
                              setEditingRule(rule);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5 text-slate-600" />
                            Editar
                          </button>

                          {/* Botão de Validação / Homologação */}
                          {rule.status !== "VALIDADA" && (
                            <button
                              type="button"
                              disabled={isPendingAction}
                              onClick={() => handleValidate(rule.id)}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Validar e Homologar
                            </button>
                          )}

                          {/* Botão de Exclusão (Admin / Líder) */}
                          {isAdminOrLeader && (
                            <button
                              type="button"
                              disabled={deletingRuleId === rule.id}
                              onClick={() => handleDelete(rule.id)}
                              title="Excluir particularidade"
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Coluna Lateral: Formulário de Cadastro com Seletor de Departamento */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 h-fit">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Plus className="w-4 h-4 text-centi-800" />
            Cadastrar Particularidade Municipal
          </h2>

          {createError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{createError}</span>
            </div>
          )}

          {createSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{createSuccess}</span>
            </div>
          )}

          <form onSubmit={handleCreateRule} className="space-y-3 text-xs">
            <input type="hidden" name="projectId" value={projectId} />

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Título da Particularidade <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                required
                placeholder="Ex: Gratificação por Tempo de Serviço (Quinquênio)"
                className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-centi-500 focus:outline-none"
              />
            </div>

            {/* Vínculo Direto com Departamento do Município */}
            <div>
              <label className="block font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-centi-700" />
                Vincular a Departamento Específico
              </label>
              <select
                name="departmentId"
                className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-centi-500 focus:outline-none bg-white"
              >
                <option value="">-- Sem departamento vinculado (Geral / Todo o Município) --</option>
                {Object.entries(groupedDepartments).map(([entityName, depts]) => (
                  <optgroup key={entityName} label={entityName}>
                    {depts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Selecione o departamento (ex: Folha de Pagamento, Contabilidade, Arrecadação) criado na estrutura do município.
              </p>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Categoria</label>
              <select
                name="category"
                defaultValue="PARTICULARIDADE_MUNICIPAL"
                className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-centi-500 focus:outline-none bg-white"
              >
                {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Servidor Municipal Informante</label>
              <input
                type="text"
                name="informantName"
                placeholder="Ex: Carlos (Chefe de RH / Coordenador da Folha)"
                className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-centi-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-amber-900 mb-1">
                Relato Verbal do Cliente (Como o município diz que funciona) <span className="text-red-500">*</span>
              </label>
              <textarea
                name="clientVerbalText"
                required
                rows={3}
                placeholder="Transcrever exatamente o que o servidor municipal alegou durante a entrevista ou reunião..."
                className="w-full p-2 border border-amber-300 bg-amber-50/40 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-emerald-950 mb-1">
                Parecer Técnico Centi & Base Legal (Lei Municipal / Padrão Centi)
              </label>
              <textarea
                name="technicalOpinion"
                rows={3}
                placeholder="Artigo da Lei Municipal, viabilidade no ERP, regras de cálculo e impacto em parametrização..."
                className="w-full p-2 border border-emerald-300 bg-emerald-50/40 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isPendingCreate}
              className="w-full py-2.5 bg-centi-800 hover:bg-centi-900 text-white rounded-lg font-bold shadow-xs transition-colors disabled:opacity-50 text-xs flex items-center justify-center gap-1.5"
            >
              {isPendingCreate ? "Registrando..." : "Registrar na Base de Conhecimento"}
            </button>
          </form>
        </div>
      </div>

      {/* MODAL DE EDIÇÃO DE PARTICULARIDADE */}
      {editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            {/* Cabeçalho do Modal */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-centi-50 text-centi-800 rounded-lg">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Editar Particularidade Municipal</h3>
                  <p className="text-[11px] text-slate-500">
                    Ajuste o conteúdo, vincule a um departamento e atualize o parecer técnico
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo do Formulário de Edição */}
            <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <input type="hidden" name="ruleId" value={editingRule.id} />

              {editError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Título */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Título da Particularidade <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  defaultValue={editingRule.title}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-centi-500 focus:outline-none"
                />
              </div>

              {/* Vínculo com Departamento */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <label className="block font-semibold text-slate-800 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-centi-700" />
                  Departamento Vinculado
                </label>
                <select
                  name="departmentId"
                  defaultValue={editingRule.departmentId || ""}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-centi-500 focus:outline-none bg-white"
                >
                  <option value="">-- Sem departamento vinculado (Geral / Todo o Município) --</option>
                  {Object.entries(groupedDepartments).map(([entityName, depts]) => (
                    <optgroup key={entityName} label={entityName}>
                      {depts.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500">
                  Vincular a um departamento específico (como Recursos Humanos / Folha, Contabilidade ou Arrecadação) facilita a visualização e filtragem por setor.
                </p>
              </div>

              {/* Categoria e Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Categoria da Regra</label>
                  <select
                    name="category"
                    defaultValue={editingRule.category}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-centi-500 focus:outline-none bg-white"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Status de Homologação</label>
                  <select
                    name="status"
                    defaultValue={editingRule.status}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-centi-500 focus:outline-none bg-white"
                  >
                    <option value="RASCUNHO">Rascunho</option>
                    <option value="EM_VALIDACAO">Em Validação</option>
                    <option value="VALIDADA">Validada / Homologada</option>
                    <option value="SUBSTITUIDA_ARQUIVADA">Substituída / Arquivada</option>
                  </select>
                </div>
              </div>

              {/* Servidor Informante */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">Servidor Municipal Informante</label>
                <input
                  type="text"
                  name="informantName"
                  defaultValue={editingRule.informantName || ""}
                  placeholder="Ex: Carlos (Chefe de RH / Coordenador da Folha)"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-centi-500 focus:outline-none"
                />
              </div>

              {/* Relato Verbal do Cliente */}
              <div>
                <label className="block font-medium text-amber-900 mb-1">
                  Relato Verbal do Cliente (Como o município diz que funciona) <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="clientVerbalText"
                  required
                  rows={4}
                  defaultValue={editingRule.clientVerbalText}
                  placeholder="Transcrever exatamente o relato do cliente..."
                  className="w-full p-2.5 border border-amber-300 bg-amber-50/40 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Parecer Técnico Centi */}
              <div>
                <label className="block font-medium text-emerald-950 mb-1">
                  Parecer Técnico Centi & Base Legal (Lei Municipal / Padrão Centi)
                </label>
                <textarea
                  name="technicalOpinion"
                  rows={4}
                  defaultValue={editingRule.technicalOpinion || ""}
                  placeholder="Artigo da Lei Municipal, viabilidade no ERP, impacto em parametrização..."
                  className="w-full p-2.5 border border-emerald-300 bg-emerald-50/40 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Rodapé de Ações do Modal */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingRule(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPendingEdit}
                  className="px-5 py-2 bg-centi-800 hover:bg-centi-900 text-white font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50 text-xs flex items-center gap-1.5"
                >
                  {isPendingEdit ? "Salvando alterações..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
