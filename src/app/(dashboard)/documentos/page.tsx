import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/server-session";
import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import {
  FolderArchive,
  Upload,
  Download,
  FileCheck,
  Shield,
  FileText,
  Clock,
  Send,
  AlertOctagon,
  HardDrive,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { storageService } from "@/lib/storage/storage-service";

export default async function DocumentosPage({
  searchParams,
}: {
  searchParams?: Promise<{ projectId?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;

  const project = await prisma.project.findFirst({
    where: params?.projectId ? { id: params.projectId } : {},
    include: {
      municipality: true,
      documents: {
        include: {
          versions: {
            orderBy: { versionNumber: "desc" },
          },
          formalizations: {
            orderBy: { sentAt: "desc" },
          },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!project) {
    return <div className="p-8 text-center text-slate-600">Nenhum projeto encontrado.</div>;
  }

  const activeDriver = storageService.getActiveDriver();
  const signedCount = project.documents.filter((d) => d.isSigned).length;

  // Server Action: Upload de Documento Seguro
  async function uploadDocumentAction(formData: FormData) {
    "use server";
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const type = formData.get("type") as any;

    if (!file || file.size === 0 || !title) return;

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Armazenamento com hash SHA-256 e validação de extensão/MIME
    const uploadResult = await storageService.uploadFile({
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      fileBuffer,
      userId: user!.id,
      projectId: project!.id,
    });

    // Cria registro de documento e primeira versão
    await prisma.document.create({
      data: {
        projectId: project!.id,
        title,
        type: type || "OUTRO",
        currentVersion: 1,
        versions: {
          create: {
            versionNumber: 1,
            fileName: uploadResult.fileName,
            fileSize: uploadResult.fileSize,
            mimeType: uploadResult.mimeType,
            sha256Hash: uploadResult.sha256Hash,
            storagePath: uploadResult.storagePath,
            uploadedBy: user?.name || "Usuário Centi",
          },
        },
      },
    });

    revalidatePath("/documentos");
  }

  // Server Action: Registrar Tentativa de Formalização
  async function addFormalizationAction(formData: FormData) {
    "use server";
    const documentId = formData.get("documentId") as string;
    const channel = formData.get("channel") as string;
    const method = formData.get("method") as any;
    const recipientName = formData.get("recipientName") as string;
    const recipientRole = formData.get("recipientRole") as string;
    const notes = formData.get("notes") as string;
    const isSigned = formData.get("isSigned") === "true";

    if (!documentId || !recipientName) return;

    await prisma.formalizationAttempt.create({
      data: {
        documentId,
        channel: channel || "CENTISIGN",
        method: method || "CENTISIGN",
        recipientName,
        recipientRole,
        notes,
        returnedAt: isSigned ? new Date() : null,
      },
    });

    if (isSigned) {
      await prisma.document.update({
        where: { id: documentId },
        data: { isSigned: true },
      });
    }

    revalidatePath("/documentos");
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Repositório de Documentos Privados e Formalizações
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Projeto: <strong>{project.name}</strong>  |  Armazenamento privado com integridade SHA-256 e trilha de formalização
          </p>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Documentos Custodiados</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{project.documents.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Com checksum criptográfico SHA-256</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Documentos Assinados / Formalizados</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            {signedCount} / {project.documents.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {project.documents.length > 0
              ? `${Math.round((signedCount / project.documents.length) * 100)}% formalizados`
              : "0%"}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Driver de Armazenamento</div>
          <div className="text-2xl font-bold text-centi-800 mt-1 uppercase flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-centi-700" />
            {activeDriver === "s3" ? "MinIO / S3" : "Disco Local"}
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">Controle de acesso IDOR ativo</p>
        </div>
      </div>

      {/* Grid: Documentos & Upload */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabela de Documentos */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FolderArchive className="w-4 h-4 text-centi-800" />
              Documentos do Projeto
            </h2>
            <span className="text-xs text-slate-500">{project.documents.length} arquivo(s)</span>
          </div>

          <div className="space-y-3">
            {project.documents.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">
                Nenhum documento arquivado neste projeto.
              </p>
            ) : (
              project.documents.map((doc) => {
                const latest = doc.versions[0];
                return (
                  <div
                    key={doc.id}
                    className="p-3.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">{doc.title}</span>
                          <StatusBadge status={doc.type} />
                          {doc.isSigned ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              ✓ Assinado
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              Aguardando Assinatura
                            </span>
                          )}
                        </div>
                        {latest && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Arquivo: <strong>{latest.fileName}</strong> ({Math.round(latest.fileSize / 1024)} KB) • Versão {latest.versionNumber}
                          </div>
                        )}
                      </div>

                      <a
                        href={`/api/documents/${doc.id}/download`}
                        className="px-2.5 py-1.5 bg-centi-800 hover:bg-centi-900 text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Baixar
                      </a>
                    </div>

                    {/* Checksum SHA-256 e Trilha de Formalizações */}
                    {latest && (
                      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px]">
                        <div className="font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 truncate max-w-md">
                          SHA-256: {latest.sha256Hash}
                        </div>

                        <div className="text-slate-500">
                          {doc.formalizations.length > 0 ? (
                            <span>{doc.formalizations.length} tentativa(s) de formalização registradas</span>
                          ) : (
                            <span className="italic">Sem tentativas registradas</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Coluna Lateral: Upload & Registro de Formalização */}
        <div className="space-y-4">
          {/* Form de Upload */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
              <Upload className="w-4 h-4 text-centi-800" />
              Upload Seguro de Documento
            </h2>

            <form action={uploadDocumentAction} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Título do Documento</label>
                <input
                  type="text"
                  name="title"
                  required
                  placeholder="Ex: Termo de Homologação Folha"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Tipo de Documento</label>
                <select name="type" className="w-full p-2 border border-slate-300 rounded-lg text-xs">
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
                <label className="block font-medium text-slate-700 mb-1">Arquivo (PDF, DOCX, XLSX, PNG)</label>
                <input
                  type="file"
                  name="file"
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-slate-50 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-centi-800 file:text-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">Limite: 20 MB. Extensões permitidas com hash SHA-256.</p>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-centi-800 hover:bg-centi-900 text-white rounded-lg font-bold shadow-xs flex items-center justify-center gap-1.5"
              >
                <Shield className="w-3.5 h-3.5" />
                Custodiar Documento
              </button>
            </form>
          </div>

          {/* Form para Registrar Tentativa de Formalização */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
              <Send className="w-4 h-4 text-emerald-700" />
              Registrar Formalização de Assinatura
            </h2>

            <form action={addFormalizationAction} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Documento Alvo</label>
                <select name="documentId" required className="w-full p-2 border border-slate-300 rounded-lg text-xs">
                  <option value="">Selecione o documento...</option>
                  {project.documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Canal</label>
                  <select name="channel" className="w-full p-2 border border-slate-300 rounded-lg text-xs">
                    <option value="CENTISIGN">CentiSign</option>
                    <option value="GOV_BR">Gov.br</option>
                    <option value="EMAIL">E-mail Formal</option>
                    <option value="PRESENCIAL">Presencial / Físico</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Método</label>
                  <select name="method" className="w-full p-2 border border-slate-300 rounded-lg text-xs">
                    <option value="CENTISIGN">Digital (CentiSign)</option>
                    <option value="GOV_BR">Digital (Gov.br)</option>
                    <option value="FISICA">Assinatura Física</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Nome do Destinatário</label>
                <input
                  type="text"
                  name="recipientName"
                  required
                  placeholder="Ex: Prefeito ou Secretário de Administração"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <input type="checkbox" name="isSigned" value="true" className="rounded" />
                  Assinatura já coletada com sucesso
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow-xs"
              >
                Salvar Registro de Envio
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
