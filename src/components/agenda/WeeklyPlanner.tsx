"use client";

import React, { useState, useTransition } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Users,
  Plus,
  Trash2,
  X,
  CheckCircle2,
  CalendarDays,
  ListFilter,
  AlertCircle,
  Briefcase,
  Sparkles,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  createAgendaEventAction,
  deleteAgendaEventAction,
} from "@/lib/actions/agenda-actions";

export interface AgendaEventItem {
  id: string;
  projectId: string;
  title: string;
  type: string;
  startDateTime: string | Date;
  endDateTime: string | Date;
  location?: string | null;
  responsibleName: string;
  participants?: string | null;
  notes?: string | null;
}

interface WeeklyPlannerProps {
  projectId: string;
  events: AgendaEventItem[];
  defaultResponsibleName?: string;
}

export function WeeklyPlanner({
  projectId,
  events,
  defaultResponsibleName = "Líder de Implantação",
}: WeeklyPlannerProps) {
  // Modo de visualização: "planner" (Colunas Seg a Sex) ou "lista" (Cronológica)
  const [viewMode, setViewMode] = useState<"planner" | "lista">("planner");

  // Offset de semanas: 0 = semana atual, -1 = semana anterior, 1 = próxima semana
  const [weekOffset, setWeekOffset] = useState(0);

  // Modal de Agendamento
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Exclusão de evento
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Cálculo dos dias da semana (Segunda a Sexta) com base no weekOffset
  const getMonday = (offset: number) => {
    const today = new Date();
    const day = today.getDay(); // 0 = Domingo, 1 = Segunda...
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.getFullYear(), today.getMonth(), diff + offset * 7);
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const monday = getMonday(weekOffset);

  const weekDays = [0, 1, 2, 3, 4].map((i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const dateKey = `${year}-${month}-${day}`;

    const todayStr = new Date().toISOString().split("T")[0];
    const isToday = dateKey === todayStr;

    const dayNames = [
      "Segunda-feira",
      "Terça-feira",
      "Quarta-feira",
      "Quinta-feira",
      "Sexta-feira",
    ];

    return {
      date: d,
      dateKey,
      dayName: dayNames[i],
      shortName: dayNames[i].substring(0, 3),
      formattedDate: `${day}/${month}`,
      isToday,
    };
  });

  // Data de início e fim da semana para exibição
  const startFormatted = `${String(monday.getDate()).padStart(2, "0")}/${String(
    monday.getMonth() + 1
  ).padStart(2, "0")}`;
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  const endFormatted = `${String(friday.getDate()).padStart(2, "0")}/${String(
    friday.getMonth() + 1
  ).padStart(2, "0")}/${friday.getFullYear()}`;

  // Formata data local de um evento em YYYY-MM-DD
  const getLocalDateKey = (dt: string | Date) => {
    const date = new Date(dt);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // Abre modal para agendar em um dia específico
  const handleOpenAddForDay = (dateKey: string) => {
    setErrorMsg(null);
    setSelectedDate(dateKey);
    setModalOpen(true);
  };

  // Submissão do agendamento
  const handleSaveEvent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const formData = new FormData(e.currentTarget);
    formData.set("projectId", projectId);

    startTransition(async () => {
      try {
        await createAgendaEventAction(formData);
        setModalOpen(false);
      } catch (err: any) {
        setErrorMsg(err.message || "Erro ao agendar compromisso.");
      }
    });
  };

  // Exclusão de evento
  const handleDeleteEvent = (eventId: string) => {
    if (!confirm("Deseja realmente remover este compromisso da agenda?")) return;
    setDeletingId(eventId);
    const formData = new FormData();
    formData.set("eventId", eventId);
    formData.set("projectId", projectId);

    startTransition(async () => {
      try {
        await deleteAgendaEventAction(formData);
      } catch (err: any) {
        alert(err.message || "Erro ao excluir compromisso.");
      } finally {
        setDeletingId(null);
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Barra de Controles: Alternador de Visualização & Navegador de Semanas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
        {/* Alternador de Abas */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => setViewMode("planner")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
              viewMode === "planner"
                ? "bg-white text-slate-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 text-emerald-700" />
            <span>Planner Semanal (Seg a Sex)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("lista")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
              viewMode === "lista"
                ? "bg-white text-slate-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ListFilter className="w-3.5 h-3.5 text-slate-500" />
            <span>Lista Cronológica ({events.length})</span>
          </button>
        </div>

        {/* Navegador de Semanas (Ativo no modo Planner) */}
        {viewMode === "planner" && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setWeekOffset((prev) => prev - 1)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                title="Semana anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                  weekOffset === 0
                    ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                Semana Atual
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset((prev) => prev + 1)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                title="Próxima semana"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <span className="text-xs font-bold text-slate-800 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
              {startFormatted} a {endFormatted}
            </span>
          </div>
        )}

        {/* Botão Novo Agendamento Geral */}
        <button
          type="button"
          onClick={() => handleOpenAddForDay(new Date().toISOString().split("T")[0])}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-centi-900 hover:bg-centi-950 text-white text-xs font-semibold transition-colors shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Agendar Compromisso</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* VISÃO 1: PLANNER SEMANAL EM 5 COLUNAS (SEGUNDA A SEXTA) */}
      {/* ===================================================================== */}
      {viewMode === "planner" && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
          {weekDays.map((day) => {
            const dayEvents = events.filter(
              (ev) => getLocalDateKey(ev.startDateTime) === day.dateKey
            );

            return (
              <div
                key={day.dateKey}
                className={`flex flex-col rounded-xl border transition-all ${
                  day.isToday
                    ? "bg-emerald-50/30 border-emerald-400 ring-1 ring-emerald-300 shadow-sm"
                    : "bg-white border-slate-200 shadow-2xs"
                }`}
              >
                {/* Cabeçalho do Dia */}
                <div
                  className={`p-3 border-b flex items-center justify-between rounded-t-xl ${
                    day.isToday
                      ? "bg-emerald-100/60 border-emerald-200 text-emerald-950"
                      : "bg-slate-50 border-slate-200 text-slate-800"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs">{day.dayName}</span>
                      {day.isToday && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-emerald-700 text-white uppercase tracking-wider">
                          Hoje
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {day.formattedDate}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-bold text-slate-500 px-1.5 py-0.5 rounded bg-white border border-slate-200">
                      {dayEvents.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenAddForDay(day.dateKey)}
                      className="p-1 rounded-md text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100/80 transition-colors"
                      title={`Agendar na ${day.dayName}`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Lista de Eventos do Dia */}
                <div className="p-2.5 flex-1 space-y-2 min-h-[220px]">
                  {dayEvents.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 rounded-lg">
                      <p className="text-[11px] text-slate-400 italic">Livre</p>
                      <button
                        type="button"
                        onClick={() => handleOpenAddForDay(day.dateKey)}
                        className="mt-2 inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Planejar</span>
                      </button>
                    </div>
                  ) : (
                    dayEvents.map((ev) => {
                      const startTime = new Date(ev.startDateTime).toLocaleTimeString(
                        "pt-BR",
                        { hour: "2-digit", minute: "2-digit" }
                      );
                      const endTime = new Date(ev.endDateTime).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <div
                          key={ev.id}
                          className="group relative p-2.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:shadow-2xs transition-all space-y-1.5"
                        >
                          {/* Horário & Tipo */}
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {startTime} - {endTime}
                            </span>
                            <StatusBadge status={ev.type} />
                          </div>

                          {/* Título do Evento */}
                          <h4 className="text-xs font-bold text-slate-900 leading-snug">
                            {ev.title}
                          </h4>

                          {/* Responsável & Local */}
                          <div className="space-y-0.5 text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3 text-slate-400 flex-shrink-0" />
                              <span className="truncate">{ev.responsibleName}</span>
                            </div>
                            {ev.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                <span className="truncate">{ev.location}</span>
                              </div>
                            )}
                          </div>

                          {ev.notes && (
                            <p className="text-[10px] text-slate-600 bg-slate-50 p-1 rounded border border-slate-100 italic">
                              {ev.notes}
                            </p>
                          )}

                          {/* Botão de Excluir */}
                          <div className="pt-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleDeleteEvent(ev.id)}
                              disabled={deletingId === ev.id}
                              className="text-slate-400 hover:text-red-600 p-0.5 rounded transition-colors text-[10px] flex items-center gap-0.5"
                              title="Remover compromisso"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Remover</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===================================================================== */}
      {/* VISÃO 2: LISTA CRONOLÓGICA CLÁSSICA */}
      {/* ===================================================================== */}
      {viewMode === "lista" && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
            Todos os Eventos do Projeto ({events.length})
          </h3>

          <div className="space-y-3">
            {events.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-6 text-center">
                Nenhum compromisso agendado.
              </p>
            ) : (
              events.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors space-y-2 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-slate-900">{ev.title}</span>
                      <StatusBadge status={ev.type} />
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(ev.startDateTime).toLocaleDateString("pt-BR")}
                      </span>

                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(ev.startDateTime).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        às{" "}
                        {new Date(ev.endDateTime).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>

                      {ev.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {ev.location}
                        </span>
                      )}

                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        Resp: {ev.responsibleName}
                      </span>
                    </div>

                    {ev.notes && <p className="text-xs text-slate-600 italic">{ev.notes}</p>}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteEvent(ev.id)}
                    disabled={deletingId === ev.id}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors self-end sm:self-center"
                    title="Excluir evento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL DE AGENDAMENTO DE COMPROMISSO */}
      {/* ===================================================================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Agendar Compromisso no Planejamento
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Treinamentos, testes, visitas ou reuniões
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Título do Compromisso *
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  placeholder="Ex: Treinamento Módulo Folha..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Tipo de Atividade *
                </label>
                <select
                  name="type"
                  required
                  defaultValue="TREINAMENTO"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                >
                  <option value="TREINAMENTO">Treinamento Prático</option>
                  <option value="TESTE">Teste de Homologação / Autonomia</option>
                  <option value="REUNIAO_GOVERNANCA">Reunião de Governança / Alinhamento</option>
                  <option value="VISITA_CAMPO">Visita de Campo / Setorial</option>
                  <option value="RITUAL">Ritual Diário Centi</option>
                  <option value="MARCO">Marco Contratual / Entrega</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">Data *</label>
                <input
                  type="date"
                  name="date"
                  required
                  defaultValue={selectedDate || new Date().toISOString().split("T")[0]}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Horário de Início *
                  </label>
                  <input
                    type="time"
                    name="startTime"
                    required
                    defaultValue="09:00"
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Horário de Término *
                  </label>
                  <input
                    type="time"
                    name="endTime"
                    required
                    defaultValue="12:00"
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Responsável Centi *
                  </label>
                  <input
                    type="text"
                    name="responsibleName"
                    required
                    defaultValue={defaultResponsibleName}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">Local</label>
                  <input
                    type="text"
                    name="location"
                    defaultValue="Presencial / Gabinete"
                    placeholder="Sala de Reuniões, RH, Remoto..."
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Participantes Convocados
                </label>
                <input
                  type="text"
                  name="participants"
                  placeholder="Ex: Secretário, Diretor de RH, Operadores..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">Observações</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Objetivos específicos do compromisso ou materiais necessários..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none resize-none"
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-centi-900 hover:bg-centi-950 text-white font-bold transition-colors shadow-xs disabled:opacity-50"
                >
                  {isPending ? "Salvando..." : "Confirmar Agendamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
