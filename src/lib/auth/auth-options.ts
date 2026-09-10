import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "../db/prisma";
import { UserRole } from "@prisma/client";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 horas de sessão ativa
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credenciais Centi",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("E-mail e senha são obrigatórios.");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
          include: {
            organization: true,
            memberships: true,
            departmentAssignments: true,
          },
        });

        if (!user || !user.isActive) {
          throw new Error("Credenciais inválidas ou conta inativa.");
        }

        const passwordMatch = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!passwordMatch) {
          throw new Error("Credenciais inválidas.");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
          organizationName: user.organization.name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as { role?: UserRole; organizationId?: string; organizationName?: string };
        token.id = user.id;
        token.role = u.role;
        token.organizationId = u.organizationId;
        token.organizationName = u.organizationName;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        const su = session.user as unknown as { id?: string; role?: UserRole; organizationId?: string; organizationName?: string };
        su.id = token.id as string;
        su.role = token.role as UserRole;
        su.organizationId = token.organizationId as string;
        su.organizationName = token.organizationName as string;
      }
      return session;
    },
  },
};
