import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function provisionAdmin() {
  const email = process.env.INITIAL_ADMIN_EMAIL || "admin@centi.com.br";
  const rawPassword = process.env.INITIAL_ADMIN_PASSWORD || "Admin@Centi2026";
  const name = process.env.INITIAL_ADMIN_NAME || "Administrador do Sistema";
  const orgName = process.env.INITIAL_ORG_NAME || "CENTI SOLUÇÕES LTDA";
  const orgCnpj = process.env.INITIAL_ORG_CNPJ || "14.419.896/0001-52";

  console.log(`Provisionando Administrador Inicial (${email})...`);

  const org = await prisma.organization.upsert({
    where: { cnpj: orgCnpj },
    update: {},
    create: {
      name: orgName,
      cnpj: orgCnpj,
      address: "Rua 94, nº 816, Qd. F16, Lt. 98/100, Sala 03, Térreo/Pavimento Superior, Setor Sul, Goiânia/GO, CEP 74.080-075",
    },
  });

  const passwordHash = await bcrypt.hash(rawPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      role: UserRole.ADMIN_GERAL,
      isActive: true,
      passwordHash,
    },
    create: {
      name,
      email,
      passwordHash,
      role: UserRole.ADMIN_GERAL,
      organizationId: org.id,
      isActive: true,
    },
  });

  console.log("===============================================================================");
  console.log("             ADMINISTRADOR PROVISIONADO COM SUCESSO                            ");
  console.log("-------------------------------------------------------------------------------");
  console.log(` Usuário:       ${admin.name}`);
  console.log(` E-mail:        ${admin.email}`);
  console.log(` Papel:         ${admin.role}`);
  console.log(` Organização:   ${org.name}`);
  console.log("===============================================================================");
}

provisionAdmin()
  .catch((e) => {
    console.error("Erro ao provisionar administrador:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
