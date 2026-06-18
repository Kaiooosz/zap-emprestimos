import { prisma } from '../src/lib/prisma';
import { createHash } from "crypto";

const clientesData = [
  { nome: 'Gilmar' },
  { nome: 'Rodolfo (Leo)' },
  { nome: 'Karin' },
  { nome: 'Leonardo (Lucas)' },
  { nome: 'Wiskey (Leo)' },
  { nome: 'Eliene (Gabriel)' },
  { nome: 'Gisele' },
  { nome: 'Leko (Leo)' },
  { nome: 'Paulinho (Leo)' },
  { nome: 'Raissa (Daniel)' },
  { nome: 'Camila (Dê)' },
  { nome: 'Amigo Thony (Charles)' },
  { nome: 'Natalia (Luciane)' },
  { nome: 'Luana (Lucas)' },
  { nome: 'Sara (Maicon)' },
  { nome: 'Indio' },
  { nome: 'Jean (Degu)' },
  { nome: 'Giane (Luciane)' },
  { nome: 'Thony (Charles)' },
  { nome: 'Lucas (Dê)' },
  { nome: 'Magrao ' },
  { nome: 'Severina (Esmeralda)' },
  { nome: 'Lucas Sonata' },
  { nome: 'Bruno (Lucas)' },
  { nome: 'Ariane (David primo)' },
  { nome: 'Jessica (Lucas)' },
  { nome: 'Joao (Degu)' },
  { nome: 'Gustavo (Lucas A.)' },
  { nome: 'Anderson (Nê)' },
  { nome: 'Sandra (Gê)' },
  { nome: 'Lucas Vinicius' },
  { nome: 'Levi' },
  { nome: 'Katia (Lalau)' },
  { nome: 'Vera' },
  { nome: 'Karla' },
  { nome: 'Wesley (Wagner)' },
  { nome: 'Viviane' },
  { nome: 'Philips (Bigula)' },
  { nome: 'Julia (Natália)' },
  { nome: 'Rick' },
  { nome: 'Robson (Raissa)' },
  { nome: 'Gabriel (100 confusão)' },
  { nome: 'Nê' },
  { nome: 'Denise' },
  { nome: 'Francisco (Maicon)' },
  { nome: 'Pimentinha (David primo)' },
  { nome: 'Diogo' },
  { nome: 'Edson' },
  { nome: 'Luiz' },
  { nome: 'Leonardo (G.M.)' },
  { nome: 'Ana (Julia)' },
  { nome: 'Luiz Felipe' },
  { nome: 'Tamires (Degu)' },
  { nome: 'Célia (David primo)' },
  { nome: 'Ana Paula' },
  { nome: 'Ana (Balbinos)' },
  { nome: 'Guilherme (David primo)' },
  { nome: 'Vinicius (Charles)' },
  { nome: 'Adriana (Joice)' },
  { nome: 'Kaio' },
  { nome: 'Luan' },
  { nome: 'Cristiane (Fátima)' },
  { nome: 'Camily' },
  { nome: 'Cristiane (Thayrone)' },
  { nome: 'Cauê (Yasmim)' },
  { nome: 'Jair' },
  { nome: 'Rosana Uyeno' },
  { nome: 'Michele' },
  { nome: 'Pedro' },
  { nome: 'Roberto' },
  { nome: 'Daniely (Denise)' },
  { nome: 'Severina' },
  { nome: 'Gê' },
  { nome: 'Osiel (Lalau)' },
  { nome: 'Wanessa (Severina)' },
  { nome: 'Gustavo (Thayrone)' },
  { nome: 'Riquely' },
  { nome: 'Rita de Cássia' },
  { nome: 'Lucas A.' },
  { nome: 'Eduardo' },
  { nome: 'Nê' },
  { nome: 'Sandra Brunis' },
  { nome: 'Geovana (David primo)' },
  { nome: 'Beatriz (David primo)' },
  { nome: 'Fátima (Elaine)' },
  { nome: 'Fabio' },
  { nome: 'Thayrone' },
  { nome: 'Edvaldo' },
  { nome: 'Ruan (Gabriel/100 confusão)' },
  { nome: 'Marlene ' },
  { nome: 'Andressa ' },
  { nome: 'Cliente (Dê)' },
  { nome: 'Edson' },
  { nome: 'Degu' },
  { nome: 'Alessandra' },
  { nome: 'Mª Fatima (Natalia/Luciane)' },
  { nome: 'Tiago (100 confusão)' },
  { nome: 'Simone (Polianna)' },
  { nome: 'Juliana (Lalau)' },
  { nome: 'Jô Maria' },
  { nome: 'Yuri (David primo)' },
  { nome: 'Fatima' },
  { nome: 'Suzane' },
  { nome: 'Mel' },
  { nome: 'Silmara (Silvana)' },
  { nome: 'Gleice' },
  { nome: 'Adriana (Sandra)' },
  { nome: 'Joao (Degu)' },
  { nome: 'Silvana (Patricia)' },
  { nome: 'Diego (Nê)' },
  { nome: 'Mel' },
  { nome: 'Giovana (Ana/Karina)' },
  { nome: 'Adriana (Giane)' },
  { nome: 'Jose (Nê)' },
  { nome: 'Luana (Jessica)' },
  { nome: 'Ione' },
  { nome: 'Talita (Andréia/G.M.)' },
  { nome: 'Riquelly' },
  { nome: 'Caroline (Patricia)' },
  { nome: 'Rafael (Concept)' },
  { nome: 'Giovana (Natália)' },
  { nome: 'Andreia (G.M.)' },
  { nome: 'Dê' },
  { nome: 'Elaine (Luciane)' },
  { nome: 'Gustavo (Esmeralda)' },
  { nome: 'Leticia (Jessica)' },
  { nome: 'Glaucia (Lucas)' },
  { nome: 'Lucas' },
  { nome: 'Rosana (Karina)' },
  { nome: 'Thaina (Letícia)' },
  { nome: 'Graziella (Gustavo)' },
  { nome: 'Cauê (Yasmim)' },
  { nome: 'Camila (Luciane)' },
  { nome: 'Gabriel (Sandra)' },
  { nome: 'Henrique (David primo)' },
  { nome: 'Giovane' },
  { nome: 'Mel' },
  { nome: 'Alzira' },
  { nome: 'Inês (Michele)' },
  { nome: 'Alessandro (Carolina)' },
  { nome: 'Thabata (Igor)' },
  { nome: 'Tila (Luciane)' },
  { nome: 'Karina' },
  { nome: 'Nubia (Leticia)' },
  { nome: 'Karine' },
  { nome: 'Jorcleane' },
  { nome: 'Karla (João)' },
  { nome: 'Esmeralda (Luciane)' },
  { nome: 'Debora (Giovana)' },
  { nome: 'Renata' },
  { nome: 'Leonardo (Camila)' },
  { nome: 'Leomara (Lalau)' },
  { nome: 'Rai (Cristiane)' },
  { nome: 'Kauan (David primo)' },
  { nome: 'Thayrone' },
  { nome: 'Kethy (Sisleide)' },
  { nome: 'Luciane' },
  { nome: 'Camila (Cauê)' },
  { nome: 'Silvana (Samira)' },
  { nome: 'Rian (Sisleide)' },
  { nome: 'Wesley (Giovane)' },
  { nome: 'Igor' },
  { nome: 'Fátima (Luciane)' },
  { nome: 'Fabiana (Jhonatan)' },
  { nome: 'Thaís (Daniela)' },
  { nome: 'Pastora (Lalau)' },
  { nome: 'Caroline (Thabata)' },
  { nome: 'Cláudio (João/Sandra)' },
  { nome: 'Rosângela ' },
  { nome: 'Luana (Letícia)' },
  { nome: 'Marcio Ar.' },
  { nome: 'Mãe (Degu)' },
  { nome: 'Letícia (Giovana)' },
  { nome: 'Mayara (Filha Fábio)' },
  { nome: 'Patricia (Lalau)' },
  { nome: 'Pedro Henrique' },
  { nome: 'Juliana' },
  { nome: 'Patrícia (Esmeralda)' },
  { nome: 'Leticia (Tila)' },
  { nome: 'Vera' },
  { nome: 'Claudio Brunis' },
  { nome: 'Beatriz (Raphael)' },
  { nome: 'Janaina (Rick)' },
  { nome: 'Sandra (Lalau)' },
  { nome: 'Stephany' }
];

async function main() {
  console.log("Iniciando seed de clientes e atualização de admin...");

  // 1. Atualizar ou criar o admin: zap@admin.com / zap1990paz
  const adminEmail = "zap@admin.com";
  const passwordHash = createHash("sha256").update("zap1990paz" + "zap2026").digest("hex");

  // Vamos procurar se já existe algum admin ou atualizar um existente
  let admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });

  if (admin) {
    admin = await prisma.user.update({
      where: { id: admin.id },
      data: {
        email: adminEmail,
        passwordHash,
      },
    });
    console.log(`Admin atualizado. E-mail: ${adminEmail}`);
  } else {
    admin = await prisma.user.create({
      data: {
        nome: 'Administrador',
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
      },
    });
    console.log(`Novo Admin criado. E-mail: ${adminEmail}`);
  }

  // Se houver outro admin antigo, podemos deletar (opcional) ou deixar pra lá
  // Aqui iremos apenas garantir que o principal tenha essas credenciais.

  // 2. Inserir clientes (se não existirem, baseando no nome por simplificação)
  const existingClients = await prisma.cliente.findMany({ select: { nome: true } });
  const existingSet = new Set(existingClients.map(c => c.nome.toLowerCase().trim()));

  const toCreate = [];
  for (const c of clientesData) {
    const nomeLimpo = c.nome.trim();
    if (!nomeLimpo) continue;
    if (!existingSet.has(nomeLimpo.toLowerCase())) {
      toCreate.push({
        nome: nomeLimpo,
        phone: "00000000000",
      });
      existingSet.add(nomeLimpo.toLowerCase());
    }
  }

  if (toCreate.length > 0) {
    await prisma.cliente.createMany({ data: toCreate, skipDuplicates: true });
    console.log(`${toCreate.length} clientes inseridos com sucesso!`);
  } else {
    console.log(`0 clientes inseridos com sucesso!`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
