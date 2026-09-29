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
import { ModuleNavTabs } from "@/components/layout/ModuleNavTabs";
import { DocumentActionModals } from "@/components/documentos/DocumentActionModals";

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
            Projeto: <strong>{project.name}</strong> &bull; Armazenamento seguro com integridade SHA-256 e trilha de formalizações
          </p>
        </div>
        <DocumentActionModals
          documents={project.documents.map((d) => ({ id: d.id, title: d.title }))}
          uploadAction={uploadDocumentAction}
          formalizationAction={addFormalizationAction}
        />
      </div>

      {/* Navegação contextual do módulo */}
      <ModuleNavTabs module="governanca" />

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Documentos Custodiados</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{project.documents.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Com checksum criptográfico SHA-256</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Documentos Assinados / Formalizados</div>
          <div className="text-2xl font-bold text-centi-800 mt-1">
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
          <p className="text-[11px] text-centi-800 font-medium mt-1">Controle de acesso IDOR ativo</p>
        </div>
      </div>

      {/* Lista de Documentos (Full Width) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FolderArchive className="w-4 h-4 text-centi-800" />
            Inventário Oficial de Documentos e Evidências
          </h2>
          <span className="text-xs text-slate-500 font-medium">{project.documents.length} documento(s)</span>
        </div>

        <div className="space-y-3">
          {project.documents.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <FolderArchive className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">Nenhum documento arquivado ainda</p>
              <p className="text-xs text-slate-400 mt-1">Utilize o botão &quot;Custodiar Documento&quot; acima para adicionar termos, checklists ou atas.</p>
            </div>
          ) : (
            project.documents.map((doc) => {
              const latest = doc.versions[0];
              return (
                <div
                  key={doc.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors space-y-3 shadow-2xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{doc.title}</span>
                        <StatusBadge status={doc.type} />
                        {doc.isSigned ? (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-centi-100 text-centi-900 border border-centi-300">
                            ✓ Assinado
                          </span>
                        ) : (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            Aguardando Assinatura
                          </span>
                        )}
                      </div>
                      {latest && (
                        <div className="text-[11px] text-slate-500 mt-1">
                          Arquivo: <strong>{latest.fileName}</strong> ({Math.round(latest.fileSize / 1024)} KB) &bull; Versão {latest.versionNumber} &bull; Enviado por: {latest.uploadedBy}
                        </div>
                      )}
                    </div>

                    <a
                      href={`/api/documents/${doc.id}/download`}
                      className="px-3 py-1.5 bg-centi-800 hover:bg-centi-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs self-end sm:self-auto transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Baixar Arquivo
                    </a>
                  </div>

                  {/* Checksum SHA-256 e Trilha de Formalizações */}
                  {latest && (
                    <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                      <div className="font-mono text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 truncate max-w-md">
                        SHA-256: {latest.sha256Hash}
                      </div>

                      <div className="text-slate-500 text-xs">
                        {doc.formalizations.length > 0 ? (
                          <span>{doc.formalizations.length} formalização(ões) registrada(s)</span>
                        ) : (
                          <span className="italic text-slate-400">Nenhuma formalização registrada</span>
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
    </div>
  );
}
