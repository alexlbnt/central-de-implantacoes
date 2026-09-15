"use server";

import prisma from "@/lib/db/prisma";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export async function requestPasswordResetAction(emailRaw: string) {
  const email = emailRaw?.toLowerCase().trim();
  if (!email) {
    throw new Error("E-mail é obrigatório.");
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.isActive) {
    // Retorna mensagem neutra para evitar enumeração de contas
    return {
      success: true,
      message: "Se o e-mail estiver cadastrado e ativo, as instruções foram geradas.",
      token: null,
    };
  }

  // Gera token seguro e salva com validade de 1 hora
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      email,
      token,
      expiresAt,
    },
  });

  return {
    success: true,
    message: "Solicitação registrada com sucesso.",
    token,
  };
}

export async function resetPasswordAction(tokenRaw: string, newPasswordRaw: string) {
  const token = tokenRaw?.trim();
  const newPassword = newPasswordRaw?.trim();

  if (!token || !newPassword) {
    throw new Error("Token e nova senha são obrigatórios.");
  }

  if (newPassword.length < 6) {
    throw new Error("A nova senha deve ter no mínimo 6 caracteres.");
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
    throw new Error("Token de recuperação inválido ou expirado.");
  }

  const user = await prisma.user.findUnique({
    where: { email: resetToken.email },
  });

  if (!user) {
    throw new Error("Usuário associado a este token não foi encontrado.");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  await prisma.passwordResetToken.update({
    where: { id: resetToken.id },
    data: { used: true },
  });

  return { success: true };
}
