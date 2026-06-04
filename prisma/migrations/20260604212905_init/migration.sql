-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPERADOR', 'COBRADOR');

-- CreateEnum
CREATE TYPE "TipoCliente" AS ENUM ('PESSOA_FISICA', 'PESSOA_JURIDICA');

-- CreateEnum
CREATE TYPE "TipoProduto" AS ENUM ('EMPRESTIMO', 'DIARIO', 'DESCONTO_CHEQUE', 'RENOVACAO', 'VENDA', 'ALUGUEL', 'ASSINATURA');

-- CreateEnum
CREATE TYPE "TipoPeriodo" AS ENUM ('DIARIO', 'SEMANAL', 'QUINZENAL', 'MENSAL');

-- CreateEnum
CREATE TYPE "ModalidadeJuros" AS ENUM ('SIMPLES', 'POR_PARCELA');

-- CreateEnum
CREATE TYPE "StatusEmprestimo" AS ENUM ('ATIVO', 'QUITADO', 'INADIMPLENTE', 'CANCELADO');

-- CreateEnum
CREATE TYPE "StatusParcela" AS ENUM ('PENDENTE', 'PAGO', 'ATRASADO', 'PARCIAL');

-- CreateEnum
CREATE TYPE "ModoPagamento" AS ENUM ('COMPLETO', 'SOMENTE_JUROS', 'QUITACAO_TOTAL', 'ANTECIPADO', 'ABATIMENTO');

-- CreateEnum
CREATE TYPE "CategoriaContaPagar" AS ENUM ('ALUGUEL', 'SALARIO', 'IMPOSTO', 'SERVICO', 'MARKETING', 'TECNOLOGIA', 'OUTROS');

-- CreateEnum
CREATE TYPE "StatusConta" AS ENUM ('PENDENTE', 'PAGO', 'VENCIDO');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OPERADOR',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "tipo" "TipoCliente" NOT NULL DEFAULT 'PESSOA_FISICA',
    "nome" TEXT NOT NULL,
    "cpf" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "endereco" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "profissao" TEXT,
    "rendaMensal" DECIMAL(12,2),
    "score" INTEGER NOT NULL DEFAULT 500,
    "temContrato" BOOLEAN NOT NULL DEFAULT false,
    "garantia" BOOLEAN NOT NULL DEFAULT false,
    "tipoGarantia" TEXT,
    "valorGarantia" DECIMAL(12,2),
    "descGarantia" TEXT,
    "referencia" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emprestimos" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "operadorId" TEXT NOT NULL,
    "tipoProduto" "TipoProduto" NOT NULL DEFAULT 'EMPRESTIMO',
    "tipo" "TipoPeriodo" NOT NULL DEFAULT 'MENSAL',
    "modalidadeJuros" "ModalidadeJuros" NOT NULL DEFAULT 'SIMPLES',
    "status" "StatusEmprestimo" NOT NULL DEFAULT 'ATIVO',
    "valorPrincipal" DECIMAL(12,2) NOT NULL,
    "taxaJuros" DECIMAL(6,2) NOT NULL,
    "totalJuros" DECIMAL(12,2) NOT NULL,
    "valorTotal" DECIMAL(12,2) NOT NULL,
    "numParcelas" INTEGER NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "temGarantia" BOOLEAN NOT NULL DEFAULT false,
    "tipoGarantia" TEXT,
    "valorGarantia" DECIMAL(12,2),
    "temContrato" BOOLEAN NOT NULL DEFAULT false,
    "observacoes" TEXT,
    "valorNominalCheque" DECIMAL(12,2),
    "dataCheque" TIMESTAMP(3),
    "custo" DECIMAL(12,2),
    "descricaoProduto" TEXT,
    "valorMensal" DECIMAL(12,2),
    "diaVencimento" INTEGER,
    "semDataFim" BOOLEAN NOT NULL DEFAULT false,
    "plano" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emprestimos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcelas" (
    "id" TEXT NOT NULL,
    "emprestimoId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "valorDevido" DECIMAL(12,2) NOT NULL,
    "valorPrincipal" DECIMAL(12,2) NOT NULL,
    "valorJuros" DECIMAL(12,2) NOT NULL,
    "valorPago" DECIMAL(12,2),
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "dataPagamento" TIMESTAMP(3),
    "status" "StatusParcela" NOT NULL DEFAULT 'PENDENTE',
    "modoPagamento" "ModoPagamento",
    "desconto" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parcelas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "score_historico" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "pontos" INTEGER NOT NULL,
    "scoreAntes" INTEGER NOT NULL,
    "scoreDepois" INTEGER NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "score_historico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contas_pagar" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" "CategoriaContaPagar" NOT NULL DEFAULT 'OUTROS',
    "valor" DECIMAL(12,2) NOT NULL,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "dataPagamento" TIMESTAMP(3),
    "status" "StatusConta" NOT NULL DEFAULT 'PENDENTE',
    "recorrente" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contas_pagar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "emprestimos" ADD CONSTRAINT "emprestimos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emprestimos" ADD CONSTRAINT "emprestimos_operadorId_fkey" FOREIGN KEY ("operadorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcelas" ADD CONSTRAINT "parcelas_emprestimoId_fkey" FOREIGN KEY ("emprestimoId") REFERENCES "emprestimos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_historico" ADD CONSTRAINT "score_historico_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
