import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server-session";
import { runAlertChecks } from "@/lib/domain/alert-checker";

export async function POST(req: NextRequest) {
  // Autenticação via CRON_SECRET ou sessão de Admin/Líder
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || "centi-cron-secret-2026";
  const isSecretValid = authHeader === `Bearer ${cronSecret}`;

  if (!isSecretValid) {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN_GERAL" && user.role !== "LIDER_PROJETO")) {
      return NextResponse.json(
        { error: "Não autorizado para execução de verificação de alertas." },
        { status: 401 }
      );
    }
  }

  try {
    const result = await runAlertChecks();
    return NextResponse.json({
      success: true,
      message: "Verificação de alertas executada com sucesso.",
      data: result,
    });
  } catch (error) {
    console.error("[CRON_ALERT_ERROR]", error);
    return NextResponse.json(
      { error: "Falha ao processar alertas.", details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
