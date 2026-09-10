import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server-session";
import prisma from "@/lib/db/prisma";
import { storageService } from "@/lib/storage/storage-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await params;

  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      project: {
        include: {
          memberships: true,
        },
      },
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
      },
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
  }

  // Verificação de isolamento IDOR
  const isMember = document.project.memberships.some((m) => m.userId === user.id);
  if (user.role !== "ADMIN_GERAL" && !isMember) {
    return NextResponse.json({ error: "Acesso negado a este documento." }, { status: 403 });
  }

  const latestVersion = document.versions[0];
  if (!latestVersion) {
    return NextResponse.json({ error: "Nenhuma versão deste arquivo foi encontrada." }, { status: 404 });
  }

  try {
    const fileBuffer = await storageService.getFileBuffer(latestVersion.storagePath);

    return new Response(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": latestVersion.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(latestVersion.fileName)}"`,
        "Content-Length": fileBuffer.length.toString(),
        "X-Sha256-Checksum": latestVersion.sha256Hash,
      },
    });
  } catch (error) {
    console.error("[STORAGE_DOWNLOAD_ERROR]", error);
    return NextResponse.json(
      { error: "Falha ao recuperar o arquivo do repositório.", details: String(error) },
      { status: 500 }
    );
  }
}
