import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";
import fs from "fs";
import path from "path";

// Carrega .env.local
const envLocal = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocal)) {
  for (const line of fs.readFileSync(envLocal, "utf-8").split("\n")) {
    const [k, ...rest] = line.split("=");
    if (k?.trim() && rest.length && !process.env[k.trim()])
      process.env[k.trim()] = rest.join("=").replace(/^"(.*)"$/, "$1");
  }
}

import { PrismaNeon } from "@prisma/adapter-neon";
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function hashSenha(senha: string): string {
  return createHash("sha256").update(senha + "zap2026").digest("hex");
}

async function main() {
  console.log("Seeding banco de dados...");

  // Limpa tabelas dependentes antes
  await prisma.scoreHistorico.deleteMany();
  await prisma.parcela.deleteMany();
  await prisma.emprestimo.deleteMany();
  await prisma.contaPagar.deleteMany();
  await prisma.template.deleteMany();
  await prisma.config.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.user.deleteMany();

  // ── Usuário Admin ──────────────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      nome:         "Admin",
      email:        "admin@zap.com",
      passwordHash: hashSenha("admin123"),
      role:         "ADMIN",
      ativo:        true,
    },
  });
  console.log(`Usuário admin criado: ${admin.email} / senha: admin123`);

  // ── Config padrão ──────────────────────────────────────────────────────────
  await prisma.config.create({
    data: {
      id: "singleton",
      data: {
        empresa: {
          razaoSocial:          "Zap Empréstimos LTDA",
          nomeFantasia:         "Zap Empréstimos",
          cnpj:                 "",
          telefone:             "",
          email:                "contato@zapemprestimos.com.br",
          endereco:             "",
          taxaJurosPadrao:      10,
          limiteEmprestimoMin:  200,
          limiteEmprestimoMax:  50000,
        },
        whatsapp: {
          apiUrl:              "",
          apiKey:              "",
          instance:            "",
          status:              "NAO_CONFIGURADO",
          numeroBusiness:      "",
          notificacoes7h:      true,
          notificacoes8h:      true,
          notificacoes12h:     true,
          enviarBemVindas:     true,
          enviarLembrete3dias: true,
          enviarQuitacao:      true,
        },
        taxasParcelamento: {
          2: 45, 3: 60, 4: 75, 5: 90,
          6: 105, 7: 120, 8: 135, 9: 150, 10: 165,
        },
      },
    },
  });

  // ── Templates WhatsApp ─────────────────────────────────────────────────────
  await prisma.template.createMany({
    data: [
      {
        nome:     "Lembrete de Vencimento",
        conteudo: "Olá *{{nome}}*!\n\nPassando para lembrar que sua parcela *{{numero}}* no valor de *{{valor}}* vence em *{{vencimento}}*.\n\nRealize o pagamento até a data para manter seu score em dia.\n\n_Zap Empréstimos — sua credibilidade em primeiro lugar._",
        ativo:    true,
      },
      {
        nome:     "Cobrança Padrão",
        conteudo: "Olá *{{nome}}*!\n\nSua parcela *{{numero}}* de *{{valor}}* está em aberto.\n\nRegularize o quanto antes para evitar juros de atraso.\n\nQualquer dúvida, fale conosco: *{{telefone_empresa}}*\n\n_Zap Empréstimos_",
        ativo:    true,
      },
      {
        nome:     "Cobrança — Atraso",
        conteudo: "Olá *{{nome}}*!\n\nSua parcela *{{numero}}* de *{{valor}}* está em atraso há *{{dias_atraso}} dias*.\n\nPor favor, regularize o quanto antes. Juros de 1% ao dia estão sendo aplicados.\n\nContato: *{{telefone_empresa}}*\n\n_Zap Empréstimos_",
        ativo:    true,
      },
    ],
  });

  console.log("Templates criados.");
  console.log("\n✓ Seed concluído!");
  console.log("─────────────────────────────────");
  console.log("Login: admin@zap.com");
  console.log("Senha: admin123");
  console.log("─────────────────────────────────");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
