"use client";

import React, { createContext, useContext, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  X,
  ShieldCheck,
  Check,
  Layers,
} from "lucide-react";
import {
  createEntityAction,
  updateEntityAction,
  deleteEntityAction,
  createDepartmentAction,
  updateDepartmentAction,
  deleteDepartmentAction,
} from "@/lib/actions/department-entity-actions";

export interface EntityItem {
  id: string;
  name: string;
  type: string;
  identifier?: string | null;
  notes?: string | null;
  departmentsCount?: number;
}

export interface DepartmentItem {
  id: string;
  entityId: string;
  name: string;
  criticality: string;
  municipalResponsibleId?: string | null;
  moduleIds?: string[];
}

export interface ModuleOption {
  id: string;
  name: string;
  code: string;
}

export interface PersonOption {
  id: string;
  name: string;
  roleTitle?: string | null;
}

interface DepartmentAdminContextType {
  isAdmin: boolean;
  openNewEntityModal: () => void;
  openEditEntityModal: (entity: EntityItem) => void;
  openDeleteEntityModal: (entity: EntityItem) => void;
  openNewDeptModal: (entityId?: string) => void;
  openEditDeptModal: (dept: DepartmentItem) => void;
  openDeleteDeptModal: (dept: DepartmentItem) => void;
}

const DepartmentAdminContext = createContext<DepartmentAdminContextType | null>(null);

export function useDepartmentAdmin() {
  const context = useContext(DepartmentAdminContext);
  return context;
}

interface ProviderProps {
  children: React.ReactNode;
  projectId: string;
  isAdmin: boolean;
  entities: EntityItem[];
  moduleCatalog: ModuleOption[];
  persons: PersonOption[];
}

export function DepartmentEntityAdminProvider({
  children,
  projectId,
  isAdmin,
  entities,
  moduleCatalog,
  persons,
}: ProviderProps) {
  const router = useRouter();
  // Estados para Modais
  const [entityModalOpen, setEntityModalOpen] = useState(false);
  const [entityToEdit, setEntityToEdit] = useState<EntityItem | null>(null);

  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [deptToEdit, setDeptToEdit] = useState<DepartmentItem | null>(null);
  const [defaultEntityId, setDefaultEntityId] = useState<string>("");

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "entity" | "department";
    id: string;
    name: string;
    details?: string;
  } | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isAdmin) {
    return <>{children}</>;
  }

  // Handlers para abrir modais
  const openNewEntityModal = () => {
    setEntityToEdit(null);
    setErrorMsg(null);
    setEntityModalOpen(true);
  };

  const openEditEntityModal = (entity: EntityItem) => {
    setEntityToEdit(entity);
    setErrorMsg(null);
    setEntityModalOpen(true);
  };

  const openDeleteEntityModal = (entity: EntityItem) => {
    setErrorMsg(null);
    setDeleteTarget({
      type: "entity",
      id: entity.id,
      name: entity.name,
      details: entity.departmentsCount
        ? `Esta instância possui ${entity.departmentsCount} departamento(s) vinculado(s).`
        : undefined,
    });
    setDeleteModalOpen(true);
  };

  const openNewDeptModal = (entityId?: string) => {
    setDeptToEdit(null);
    setDefaultEntityId(entityId || (entities[0]?.id ?? ""));
    setErrorMsg(null);
    setDeptModalOpen(true);
  };

  const openEditDeptModal = (dept: DepartmentItem) => {
    setDeptToEdit(dept);
    setDefaultEntityId(dept.entityId);
    setErrorMsg(null);
    setDeptModalOpen(true);
  };

  const openDeleteDeptModal = (dept: DepartmentItem) => {
    setErrorMsg(null);
    setDeleteTarget({
      type: "department",
      id: dept.id,
      name: dept.name,
      details: "Os processos críticos, entregas e atribuições vinculadas a este setor serão removidos.",
    });
    setDeleteModalOpen(true);
  };

  // Submissão: Salvar Instância Setorial
  const handleSaveEntity = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const formData = new FormData(e.currentTarget);
    formData.set("projectId", projectId);
    if (entityToEdit) {
      formData.set("entityId", entityToEdit.id);
    }

    startTransition(async () => {
      try {
        if (entityToEdit) {
          await updateEntityAction(formData);
        } else {
          await createEntityAction(formData);
        }
        setEntityModalOpen(false);
      } catch (err: any) {
        setErrorMsg(err.message || "Erro ao salvar instância setorial.");
      }
    });
  };

  // Submissão: Salvar Departamento
  const handleSaveDepartment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const formData = new FormData(e.currentTarget);
    if (deptToEdit) {
      formData.set("departmentId", deptToEdit.id);
    }

    startTransition(async () => {
      try {
        if (deptToEdit) {
          await updateDepartmentAction(formData);
        } else {
          await createDepartmentAction(formData);
        }
        setDeptModalOpen(false);
      } catch (err: any) {
        setErrorMsg(err.message || "Erro ao salvar departamento.");
      }
    });
  };

  // Submissão: Confirmar Exclusão
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    setErrorMsg(null);
    const formData = new FormData();

    startTransition(async () => {
      try {
        if (deleteTarget.type === "entity") {
          formData.set("entityId", deleteTarget.id);
          await deleteEntityAction(formData);
        } else {
          formData.set("departmentId", deleteTarget.id);
          await deleteDepartmentAction(formData);
          if (typeof window !== "undefined" && window.location.pathname.includes(deleteTarget.id)) {
            router.push("/departamentos");
          }
        }
        setDeleteModalOpen(false);
        setDeleteTarget(null);
      } catch (err: any) {
        setErrorMsg(err.message || "Erro ao excluir registro.");
      }
    });
  };

  return (
    <DepartmentAdminContext.Provider
      value={{
        isAdmin,
        openNewEntityModal,
        openEditEntityModal,
        openDeleteEntityModal,
        openNewDeptModal,
        openEditDeptModal,
        openDeleteDeptModal,
      }}
    >
      {children}

      {/* ===================================================================== */}
      {/* MODAL: INSTÂNCIA SETORIAL (CRIAR / EDITAR) */}
      {/* ===================================================================== */}
      {entityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-centi-950 text-white">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">
                  {entityToEdit ? "Editar Instância Setorial" : "Nova Instância Setorial (Entidade)"}
                </h3>
              </div>
              <button
                onClick={() => setEntityModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEntity} className="p-6 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Nome da Instância / Entidade *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={entityToEdit?.name || ""}
                  placeholder="Ex: Prefeitura Municipal, Câmara de Vereadores, Fundo Municipal de Saúde"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-centi-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Tipo de Entidade *
                  </label>
                  <select
                    name="type"
                    required
                    defaultValue={entityToEdit?.type || "PREFEITURA"}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-centi-600 focus:outline-none"
                  >
                    <option value="PREFEITURA">Prefeitura Municipal</option>
                    <option value="CAMARA">Câmara de Vereadores</option>
                    <option value="FUNDO">Fundo Municipal</option>
                    <option value="AUTARQUIA">Autarquia</option>
                    <option value="OUTRO">Outra Entidade Pública</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    CNPJ / Identificador (Opcional)
                  </label>
                  <input
                    type="text"
                    name="identifier"
                    defaultValue={entityToEdit?.identifier || ""}
                    placeholder="Ex: 14.419.896/0001-52"
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-centi-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Observações de Escopo (Opcional)
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={entityToEdit?.notes || ""}
                  placeholder="Particularidades orçamentárias, base legal ou escopo institucional..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-centi-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEntityModalOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-centi-900 hover:bg-centi-950 text-white font-bold transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isPending ? "Salvando..." : entityToEdit ? "Salvar Alterações" : "Criar Instância"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: DEPARTAMENTO (CRIAR / EDITAR) */}
      {/* ===================================================================== */}
      {deptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 bg-centi-950 text-white flex-shrink-0">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">
                  {deptToEdit ? "Editar Departamento" : "Novo Departamento (Unidade Setorial)"}
                </h3>
              </div>
              <button
                onClick={() => setDeptModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDepartment} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Instância Setorial de Lotação *
                </label>
                <select
                  name="entityId"
                  required
                  defaultValue={deptToEdit?.entityId || defaultEntityId}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-centi-600 focus:outline-none"
                >
                  {entities.map((ent) => (
                    <option key={ent.id} value={ent.id}>
                      {ent.name} ({ent.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Nome do Departamento / Setor *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={deptToEdit?.name || ""}
                  placeholder="Ex: Recursos Humanos / Folha de Pagamento, Contabilidade e Finanças..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-centi-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Criticidade Operacional *
                  </label>
                  <select
                    name="criticality"
                    required
                    defaultValue={deptToEdit?.criticality || "ALTA"}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-centi-600 focus:outline-none"
                  >
                    <option value="CRITICA">Crítica (Fechamento/Legal)</option>
                    <option value="ALTA">Alta (Essencial)</option>
                    <option value="MEDIA">Média (Apoio)</option>
                    <option value="BAIXA">Baixa (Secundário)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Responsável Municipal Titular
                  </label>
                  <select
                    name="municipalResponsibleId"
                    defaultValue={deptToEdit?.municipalResponsibleId || ""}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-centi-600 focus:outline-none"
                  >
                    <option value="">A definir no município</option>
                    {persons.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.roleTitle ? `(${p.roleTitle})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Módulos do Catálogo Centi */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">
                  Módulos ERP Centi Vinculados
                </label>
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg max-h-36 overflow-y-auto">
                  {moduleCatalog.map((mod) => {
                    const isChecked = deptToEdit?.moduleIds?.includes(mod.id);
                    return (
                      <label
                        key={mod.id}
                        className="flex items-center gap-2 p-1 rounded hover:bg-white cursor-pointer select-none text-slate-700 text-[11px]"
                      >
                        <input
                          type="checkbox"
                          name="moduleIds"
                          value={mod.id}
                          defaultChecked={isChecked}
                          className="rounded border-slate-300 text-centi-600 focus:ring-centi-600"
                        />
                        <span>{mod.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setDeptModalOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-centi-900 hover:bg-centi-950 text-white font-bold transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isPending ? "Salvando..." : deptToEdit ? "Salvar Alterações" : "Criar Departamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO */}
      {/* ===================================================================== */}
      {deleteModalOpen && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-slate-900">
                  {deleteTarget.type === "entity"
                    ? "Excluir Instância Setorial?"
                    : "Excluir Departamento?"}
                </h3>
                <p className="text-xs text-slate-600">
                  Você está prestes a excluir definitivamente{" "}
                  <strong className="text-slate-900">{deleteTarget.name}</strong>.
                </p>
                {deleteTarget.details && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-md border border-amber-200 mt-2 font-medium">
                    {deleteTarget.details}
                  </p>
                )}
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeleteTarget(null);
                }}
                disabled={isPending}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isPending}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {isPending ? "Excluindo..." : "Sim, Excluir Definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DepartmentAdminContext.Provider>
  );
}

// =============================================================================
// SUB-COMPONENTES AUXILIARES PARA INSERÇÃO NAS TELAS
// =============================================================================

export function AdminTopActions() {
  const admin = useDepartmentAdmin();
  if (!admin || !admin.isAdmin) return null;

  return (
    <div className="flex items-center gap-2.5 flex-wrap">
      <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        Admin Geral Habilitado
      </span>

      <button
        onClick={admin.openNewEntityModal}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 transition-colors shadow-2xs"
      >
        <Building2 className="w-3.5 h-3.5 text-emerald-700" />
        <span>+ Nova Instância Setorial</span>
      </button>

      <button
        onClick={() => admin.openNewDeptModal()}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-centi-900 hover:bg-centi-950 text-white text-xs font-semibold transition-colors shadow-2xs"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>+ Novo Departamento</span>
      </button>
    </div>
  );
}

export function EntityAdminMenu({ entity }: { entity: EntityItem }) {
  const admin = useDepartmentAdmin();
  if (!admin || !admin.isAdmin) return null;

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => admin.openNewDeptModal(entity.id)}
        className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
        title="Adicionar Departamento nesta Instância"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => admin.openEditEntityModal(entity)}
        className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
        title="Editar Instância Setorial"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => admin.openDeleteEntityModal(entity)}
        className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
        title="Excluir Instância Setorial"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function DepartmentAdminMenu({ dept }: { dept: DepartmentItem }) {
  const admin = useDepartmentAdmin();
  if (!admin || !admin.isAdmin) return null;

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => admin.openEditDeptModal(dept)}
        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        title="Editar Departamento"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => admin.openDeleteDeptModal(dept)}
        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
        title="Excluir Departamento"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function DepartmentDetailAdminButtons({ dept }: { dept: DepartmentItem }) {
  const admin = useDepartmentAdmin();
  if (!admin || !admin.isAdmin) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => admin.openEditDeptModal(dept)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
      >
        <Pencil className="w-3.5 h-3.5 text-slate-500" />
        <span>Editar Departamento</span>
      </button>
      <button
        type="button"
        onClick={() => admin.openDeleteDeptModal(dept)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-xs font-semibold text-red-600 transition-colors shadow-2xs"
      >
        <Trash2 className="w-3.5 h-3.5 text-red-500" />
        <span>Excluir</span>
      </button>
    </div>
  );
}

