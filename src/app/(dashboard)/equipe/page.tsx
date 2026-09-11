import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/server-session";
import prisma from "@/lib/db/prisma";
import {
  Users,
  ShieldCheck,
  Building2,
  Mail,
  Phone,
  Plus,
  UserPlus,
  Briefcase,
  UserCheck,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  TeamMemberAdminProvider,
  AddTeamMemberButton,
  TeamMemberItemActions,
} from "@/components/team/TeamMemberAdminManager";
import { createMunicipalPersonAction } from "@/lib/actions/team-actions";

export default async function EquipePage({
  searchParams,
}: {
  searchParams?: Promise<{ projectId?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;

  let project = null;
  try {
    project = await prisma.project.findFirst({
      where: params?.projectId ? { id: params.projectId } : {},
      include: {
        municipality: true,
        memberships: {
          include: {
            user: {
              include: {
                departmentAssignments: {
                  include: { department: true },
                },
              },
            },
          },
        },
        entities: {
          include: {
            departments: {
              include: {
                municipalResponsible: true,
                municipalSubstitute: true,
              },
            },
          },
        },
      },
    });
  } catch (err) {
    console.error("Erro ao buscar projeto na tela de equipe:", err);
  }

  if (!project) {
    return <div className="p-8 text-center text-slate-600">Nenhum projeto encontrado.</div>;
  }

  const canManageTeam =
    user?.role === "ADMIN_GERAL" ||
    (project.memberships || []).some((m) => m.userId === user?.id && m.role === "LIDER_PROJETO");

  const projectDepartments = (project.entities || []).flatMap((entity) =>
    (entity.departments || []).map((dept) => ({
      id: dept.id,
      name: dept.name,
      entityName: entity.name,
    }))
  );

  // Busca pessoas municipais com tratamento defensivo
  let municipalPersons: any[] = [];
  try {
    municipalPersons = await prisma.person.findMany({
      where: { isMunicipal: true },
      include: {
        responsibleDepartments: true,
        substituteDepartments: true,
      },
      orderBy: { name: "asc" },
    });
  } catch (err) {
    console.error("Erro ao buscar contatos municipais:", err);
  }

  // Busca usuários para vincular à equipe Centi
  let allUsers: any[] = [];
  try {
    allUsers = await prisma.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  } catch (err) {
    console.error("Erro ao buscar usuários Centi:", err);
  }

  const existingMemberUserIds = new Set((project.memberships || []).map((m) => m.userId));
  const availableUsers = allUsers
    .filter((u) => !existingMemberUserIds.has(u.id))
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
    }));

  const validMemberships = (project.memberships || []).filter((m) => !!m.user);

  return (
    <TeamMemberAdminProvider
      projectId={project.id}
      canManageTeam={canManageTeam}
      availableUsers={availableUsers}
      projectDepartments={projectDepartments}
    >
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Matriz de Equipe e Responsáveis
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Projeto: <strong>{project.name}</strong>  |  Articulação integrada entre corpo técnico Centi e equipe municipal
            </p>
          </div>
          {canManageTeam && (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Gestão da Equipe Habilitada
              </span>
              <AddTeamMemberButton />
            </div>
          )}
        </div>

        {/* Grid: Equipe Centi vs Equipe Municipal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coluna 1: Equipe Centi Soluções */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Equipe Técnica Centi Soluções</h2>
                  <p className="text-[11px] text-slate-500">Colaboradores Centi com usuário e acesso ativo à Central</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                  {validMemberships.length} membro(s)
                </span>
                <AddTeamMemberButton />
              </div>
            </div>

            <div className="space-y-3">
              {validMemberships.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center">
                  Nenhum membro técnico alocado neste projeto ainda.
                </p>
              ) : (
                validMemberships.map((m) => {
                  const userDeptAssignments = (m.user?.departmentAssignments || []).filter(
                    (a) => a && a.department && projectDepartments.some((d) => d.id === a.departmentId)
                  );
                  return (
                    <div
                      key={m.id}
                      className="p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors bg-slate-50/50 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-xs text-slate-900">{m.user?.name || "Colaborador Centi"}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {m.user?.email || ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={m.role} />
                          <TeamMemberItemActions
                            member={{
                              membershipId: m.id,
                              userId: m.user?.id || m.userId,
                              name: m.user?.name || "Colaborador Centi",
                              email: m.user?.email || "",
                              role: m.role,
                              departmentIds: userDeptAssignments.map((a) => a.departmentId),
                            }}
                          />
                        </div>
                      </div>

                      {userDeptAssignments.length > 0 && (
                        <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-200">
                          <span className="font-semibold">Departamentos: </span>
                          {userDeptAssignments
                            .map((a) => a.department?.name)
                            .filter(Boolean)
                            .join(", ") || "Geral / Sem setor específico"}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {canManageTeam && (
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                <span>Gestão da equipe liberada para Líder e Administrador Geral</span>
                <AddTeamMemberButton />
              </div>
            )}
          </div>

        {/* Coluna 2: Equipe Municipal (Pontos Focais) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-700" />
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Pontos Focais do Município ({project.municipality?.name || "Município"})
                </h2>
                <p className="text-[11px] text-slate-500">Contatos de referência e responsáveis pelos setores (sem login)</p>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
              {municipalPersons.length} cadastrado(s)
            </span>
          </div>

          {/* Aviso de Uso Interno Centi */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-emerald-950 text-[11px] space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>Registro de Contatos & Titulares Setoriais</span>
            </div>
            <p className="text-slate-600">
              Os servidores municipais cadastrados aqui servem para controle de presenças em treinamentos e validação de autonomia. <strong>Eles não possuem acesso nem usuário na Central Centi.</strong>
            </p>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {municipalPersons.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">
                Nenhum servidor municipal cadastrado ainda.
              </p>
            ) : (
              municipalPersons.map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors bg-white space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-xs text-slate-900">{p.name}</div>
                      <div className="text-[11px] font-semibold text-emerald-800">{p.roleTitle}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                    {p.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {p.email}
                      </span>
                    )}
                    {p.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {p.phone}
                      </span>
                    )}
                  </div>

                  {(p.responsibleDepartments || []).length > 0 && (
                    <div className="text-[10px] text-slate-500">
                      <strong>Responsável Titular:</strong>{" "}
                      {(p.responsibleDepartments || []).map((d: any) => d?.name).filter(Boolean).join(", ")}
                    </div>
                  )}

                  {p.notes && (
                    <div className="text-[10px] text-slate-500 italic">
                      Obs: {p.notes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Form para Cadastrar Ponto Focal Municipal */}
          <div className="pt-3 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-emerald-700" />
              Cadastrar Ponto Focal Municipal
            </h3>
            <form action={createMunicipalPersonAction} className="space-y-2 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="Nome completo do servidor"
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    name="roleTitle"
                    required
                    placeholder="Cargo (ex: Secretário de Finanças)"
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <input
                    type="email"
                    name="email"
                    placeholder="E-mail funcional"
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    name="phone"
                    placeholder="Telefone / WhatsApp"
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <input
                  type="text"
                  name="notes"
                  placeholder="Horário de atendimento, substituto ou observações..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold"
              >
                Salvar Ponto Focal
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
    </TeamMemberAdminProvider>
  );
}
