"use client";

import React, { createContext, useContext, useState, useTransition } from "react";
import {
  UserPlus,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  Check,
  ShieldCheck,
  Briefcase,
  Layers,
  Users,
} from "lucide-react";
import {
  createTeamMemberAction,
  updateTeamMemberAction,
  removeTeamMemberAction,
} from "@/lib/actions/team-actions";

export interface TeamMemberData {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  departmentIds: string[];
}

export interface AvailableUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface ProjectDepartmentOption {
  id: string;
  name: string;
  entityName: string;
}

interface TeamAdminContextType {
  openAddModal: () => void;
  openEditModal: (member: TeamMemberData) => void;
  openRemoveModal: (member: TeamMemberData) => void;
}

const TeamAdminContext = createContext<TeamAdminContextType | null>(null);

export function useTeamAdmin() {
  return useContext(TeamAdminContext);
}

interface ProviderProps {
  children: React.ReactNode;
  projectId: string;
  canManageTeam: boolean;
  availableUsers: AvailableUser[];
  projectDepartments: ProjectDepartmentOption[];
}

export function TeamMemberAdminProvider({
  children,
  projectId,
  canManageTeam,
  availableUsers,
  projectDepartments,
}: ProviderProps) {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addMode, setAddMode] = useState<"new_user" | "existing_user">("new_user");

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<TeamMemberData | null>(null);

  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<TeamMemberData | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!canManageTeam) {
    return <>{children}</>;
  }

  const openAddModal = () => {
    setErrorMsg(null);
    setAddMode("new_user");
    setAddModalOpen(true);
  };

  const openEditModal = (member: TeamMemberData) => {
    setErrorMsg(null);
    setMemberToEdit(member);
    setEditModalOpen(true);
  };

  const openRemoveModal = (member: TeamMemberData) => {
    setErrorMsg(null);
    setMemberToRemove(member);
    setRemoveModalOpen(true);
  };

  // Submissão: Criar / Alocar Membro
  const handleSaveAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const formData = new FormData(e.currentTarget);
    formData.set("projectId", projectId);
    formData.set("mode", addMode);

    startTransition(async () => {
      try {
        await createTeamMemberAction(formData);
        setAddModalOpen(false);
      } catch (err: any) {
        setErrorMsg(err.message || "Erro ao adicionar membro à equipe.");
      }
    });
  };

  // Submissão: Editar Membro
  const handleSaveEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!memberToEdit) return;
    setErrorMsg(null);
    const formData = new FormData(e.currentTarget);
    formData.set("projectId", projectId);
    formData.set("membershipId", memberToEdit.membershipId);
    formData.set("userId", memberToEdit.userId);

    startTransition(async () => {
      try {
        await updateTeamMemberAction(formData);
        setEditModalOpen(false);
        setMemberToEdit(null);
      } catch (err: any) {
        setErrorMsg(err.message || "Erro ao atualizar membro da equipe.");
      }
    });
  };

  // Submissão: Remover Membro
  const handleConfirmRemove = () => {
    if (!memberToRemove) return;
    setErrorMsg(null);
    const formData = new FormData();
    formData.set("projectId", projectId);
    formData.set("membershipId", memberToRemove.membershipId);
    formData.set("userId", memberToRemove.userId);

    startTransition(async () => {
      try {
        await removeTeamMemberAction(formData);
        setRemoveModalOpen(false);
        setMemberToRemove(null);
      } catch (err: any) {
        setErrorMsg(err.message || "Erro ao remover membro da equipe.");
      }
    });
  };

  return (
    <TeamAdminContext.Provider value={{ openAddModal, openEditModal, openRemoveModal }}>
      {children}

      {/* ===================================================================== */}
      {/* MODAL: ADICIONAR MEMBRO (NOVO USUÁRIO OU ALOCAR EXISTENTE) */}
      {/* ===================================================================== */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Adicionar Membro à Equipe Técnica
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Alocação de analistas, líderes e especialistas Centi
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Alternador de Modo: Novo Usuário vs Usuário Existente */}
            <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setAddMode("new_user")}
                className={`flex-1 py-1.5 rounded-md text-center transition-colors ${
                  addMode === "new_user"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Cadastrar Novo Usuário Centi
              </button>
              <button
                type="button"
                onClick={() => setAddMode("existing_user")}
                className={`flex-1 py-1.5 rounded-md text-center transition-colors ${
                  addMode === "existing_user"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Alocar Usuário Existente ({availableUsers.length})
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-4 text-xs">
              {addMode === "new_user" ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-800 mb-1">
                        Nome Completo *
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        placeholder="Ex: Mariana Silva"
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-800 mb-1">
                        E-mail Centi (@centi.com.br) *
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        placeholder="mariana.silva@centi.com.br"
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-800 mb-1">
                      Senha Provisória de Acesso
                    </label>
                    <input
                      type="text"
                      name="password"
                      defaultValue="Centi@2026"
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Padrão sugerido: <code>Centi@2026</code>. O usuário poderá redefinir em seu primeiro login.
                    </p>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Selecione o Usuário Centi *
                  </label>
                  {availableUsers.length === 0 ? (
                    <p className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px]">
                      Todos os usuários cadastrados da Centi já estão alocados neste projeto. Utilize a aba &quot;Cadastrar Novo Usuário Centi&quot;.
                    </p>
                  ) : (
                    <select
                      name="userId"
                      required
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    >
                      <option value="">Selecione um analista...</option>
                      {availableUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} — {u.email} ({u.role})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Papel no Projeto */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Papel Formal no Projeto *
                </label>
                <select
                  name="role"
                  required
                  defaultValue="ANALISTA"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                >
                  <option value="LIDER_PROJETO">Líder de Implantação / Projeto</option>
                  <option value="ANALISTA">Analista de Implantação</option>
                  <option value="BA">Business Analyst (Regras e Legislação)</option>
                  <option value="QA">QA / Homologador Técnico</option>
                  <option value="CRM_BRIDGE">CRM Bridge (Transição)</option>
                  <option value="DC">Diretor de Contas (DC)</option>
                </select>
              </div>

              {/* Departamentos Atribuídos */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1.5 flex items-center justify-between">
                  <span>Departamentos Atribuídos neste Projeto</span>
                  <span className="text-[10px] text-slate-500 font-normal">Opcional</span>
                </label>
                {projectDepartments.length === 0 ? (
                  <p className="p-2 text-slate-500 italic text-[11px]">
                    Nenhum departamento cadastrado neste projeto.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg max-h-40 overflow-y-auto">
                    {projectDepartments.map((dept) => (
                      <label
                        key={dept.id}
                        className="flex items-start gap-2 p-1.5 rounded hover:bg-white cursor-pointer select-none text-slate-700 text-[11px]"
                      >
                        <input
                          type="checkbox"
                          name="departmentIds"
                          value={dept.id}
                          className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                        />
                        <div className="leading-tight">
                          <span className="font-semibold text-slate-800">{dept.name}</span>
                          <span className="text-[10px] text-slate-500 block">{dept.entityName}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || (addMode === "existing_user" && availableUsers.length === 0)}
                  className="px-4 py-2 rounded-lg bg-centi-900 hover:bg-centi-950 text-white font-bold transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isPending ? "Salvando..." : "Confirmar Alocação"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: EDITAR MEMBRO DA EQUIPE */}
      {/* ===================================================================== */}
      {editModalOpen && memberToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Editar Membro da Equipe Técnica
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Ajuste de papel, dados cadastrais e setores atribuídos
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditModalOpen(false);
                  setMemberToEdit(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={memberToEdit.name}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    E-mail Centi *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    defaultValue={memberToEdit.email}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Papel no Projeto */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Papel no Projeto *
                </label>
                <select
                  name="role"
                  required
                  defaultValue={memberToEdit.role}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                >
                  <option value="LIDER_PROJETO">Líder de Implantação / Projeto</option>
                  <option value="ANALISTA">Analista de Implantação</option>
                  <option value="BA">Business Analyst (Regras e Legislação)</option>
                  <option value="QA">QA / Homologador Técnico</option>
                  <option value="CRM_BRIDGE">CRM Bridge (Transição)</option>
                  <option value="DC">Diretor de Contas (DC)</option>
                </select>
              </div>

              {/* Departamentos Atribuídos */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1.5 flex items-center justify-between">
                  <span>Departamentos Atribuídos no Projeto</span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    {memberToEdit.departmentIds.length} selecionado(s)
                  </span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg max-h-40 overflow-y-auto">
                  {projectDepartments.map((dept) => {
                    const isChecked = memberToEdit.departmentIds.includes(dept.id);
                    return (
                      <label
                        key={dept.id}
                        className="flex items-start gap-2 p-1.5 rounded hover:bg-white cursor-pointer select-none text-slate-700 text-[11px]"
                      >
                        <input
                          type="checkbox"
                          name="departmentIds"
                          value={dept.id}
                          defaultChecked={isChecked}
                          className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                        />
                        <div className="leading-tight">
                          <span className="font-semibold text-slate-800">{dept.name}</span>
                          <span className="text-[10px] text-slate-500 block">{dept.entityName}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditModalOpen(false);
                    setMemberToEdit(null);
                  }}
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
                  {isPending ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: CONFIRMAÇÃO DE REMOÇÃO DA EQUIPE */}
      {/* ===================================================================== */}
      {removeModalOpen && memberToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-slate-900">
                  Remover Membro da Equipe Técnica?
                </h3>
                <p className="text-xs text-slate-600">
                  Você está prestes a desalocar{" "}
                  <strong className="text-slate-900">{memberToRemove.name}</strong>{" "}
                  ({memberToRemove.email}) da equipe técnica deste projeto.
                </p>
                <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-md border border-amber-200 mt-2 font-medium">
                  As alocações deste analista nos departamentos do projeto serão removidas. A conta do usuário permanecerá ativa na base corporativa Centi.
                </p>
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
                  setRemoveModalOpen(false);
                  setMemberToRemove(null);
                }}
                disabled={isPending}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                disabled={isPending}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {isPending ? "Removendo..." : "Confirmar Remoção"}
              </button>
            </div>
          </div>
        </div>
      )}
    </TeamAdminContext.Provider>
  );
}

// =============================================================================
// SUB-COMPONENTES AUXILIARES PARA INSERÇÃO NA TELA
// =============================================================================

export function AddTeamMemberButton() {
  const admin = useTeamAdmin();
  if (!admin) return null;

  return (
    <button
      type="button"
      onClick={admin.openAddModal}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-centi-900 hover:bg-centi-950 text-white text-xs font-semibold transition-colors shadow-2xs"
    >
      <UserPlus className="w-3.5 h-3.5" />
      <span>+ Adicionar Membro</span>
    </button>
  );
}

export function TeamMemberItemActions({ member }: { member: TeamMemberData }) {
  const admin = useTeamAdmin();
  if (!admin) return null;

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => admin.openEditModal(member)}
        className="p-1 rounded-md border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        title="Editar dados e setores atribuídos"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => admin.openRemoveModal(member)}
        className="p-1 rounded-md border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
        title="Remover da equipe do projeto"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
