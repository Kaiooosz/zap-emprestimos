@AGENTS.md

# Zap Empréstimos 2.0 — Documentação Completa

## Regras Absolutas (nunca violar)

- NUNCA usar emojis em código, UI, copy, commits, mensagens ou qualquer interface
- NUNCA usar cores saturadas/coloridas — paleta: branco, azul escuro, tons de slate
- Fundo branco (#fff), detalhes azul escuro (blue-700 / oklch(0.35 0.243 264.376))
- Plus Jakarta Sans como fonte em todos os textos
- Sem feature flags, sem compatibilidade reversa desnecessária
- Sem abstrações prematuras — 3 linhas similares antes de extrair função
- Código funcional primeiro, sem comentários não solicitados
- Não alterar o que não foi pedido

## Stack

- Next.js 16 (App Router), TypeScript, Tailwind CSS + shadcn/ui
- Prisma v7, PostgreSQL via Neon (us-east-1, c-8)
- Vercel (main = produção)
- Node.js >= 20.x (usar nvm: ~/.nvm/versions/node/v20.10.0)
- Plus Jakarta Sans (next/font/google)

## Banco de dados (Neon — Produção)

```
postgresql://neondb_owner:npg_sONFob8ka2Xr@ep-plain-meadow-aqkuva35.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require
```

Config em `.env.local` — nunca commitar este arquivo.

## Branding / Tema

- Fundo: branco (`oklch(1 0 0)`)
- Primary: azul escuro (`oklch(0.35 0.243 264.376)` = `blue-700`)
- Foreground: slate-900 escuro (`oklch(0.148 0.004 228.8)`)
- Bordas: slate-200 (`oklch(0.925 0.005 214.3)`)
- Cards: branco com sombra leve (`shadow-sm`)
- Fonte: Plus Jakarta Sans (300–800)
- Logo topbar: `/public/logo-zap-semfundo.png` (PNG com fundo transparente)
- Ícone sidebar: `/public/logo-icon.png` (128×128)
- Favicon: `/public/favicon.ico`, `favicon-32.png`, `apple-touch-icon.png`

## Regras de Negócio Financeiras

### Modalidade 1 — Empréstimo Mensal Rolável

Cliente toma valor e tem 1 mês para quitar. No vencimento, 3 opções:

**Opção A — Liquidação total:**
- Principal + juros integrais
- Dívida encerrada

**Opção B — Paga só os juros (renovação):**
- Paga apenas os juros do período
- Principal continua intacto
- Dívida adiada por mais 1 mês com mesmas condições

**Opção C — Abatimento parcial do principal:**
- Pagamento recebido: 1) cobre juros devidos, 2) abate o principal
- Novo saldo = principal − valor abatido
- Juros futuros incidem sobre novo saldo
- Percentual de quitação atualizado

### Modalidade 2 — Parcelado com Taxa Personalizada

- Pagamento exato: parcela paga, avança para próxima
- Pagamento abaixo: inadimplência parcial, juros de atraso sobre saldo faltante
- Pagamento acima: excedente retido e descontado na próxima parcela
- Abatimento explícito do principal: recalcula saldo e percentual de quitação

### Juros de Atraso

Dois modos (configurável por perfil de cliente):
- **Regra A** — Base: parcela inteira: `Juros atraso = parcela × % diário × dias`
- **Regra B** — Base: saldo restante: `Juros atraso = (parcela − pago) × % diário × dias`
- % diário padrão: 1% (configurável por perfil)
- Aplica a partir do 1º dia após vencimento

### Fluxo de Liquidação (qualquer pagamento)

1. Identifica contrato e parcela em aberto
2. Verifica atraso → calcula juros acumulados
3. Separa valor recebido:
   a. Cobre juros de atraso (se houver)
   b. Cobre juros mensais
   c. Excedente: Mod.1 → abate principal | Mod.2 → retém para próxima
4. Atualiza saldo devedor
5. Atualiza % de quitação
6. Registra histórico de pagamento
7. Verifica quitação total

### Perfis de Cliente (Admin configura)

| Parâmetro | Descrição |
|-----------|-----------|
| Modalidades permitidas | 1, 2 ou ambas |
| Taxa mensal | % |
| Regra de atraso | A (parcela inteira) ou B (saldo restante) |
| % diário de atraso | padrão 1% |
| Prazo máximo Mod.2 | N meses |

## Módulos do Sistema

| Módulo | Rota | Descrição |
|--------|------|-----------|
| Home pública | `/` | Landing page marketing |
| Login | `/login` | Autenticação |
| Registro | `/register` | Criar conta |
| Dashboard | `/dashboard` | Visão geral, filtros por período/status |
| Empréstimos | `/emprestimos` | CRUD de contratos |
| Novo contrato | `/emprestimos/novo` | Wizard com 7 tipos de operação |
| Detalhe | `/emprestimos/[id]` | Parcelas + modal pagamento 3 modos |
| Clientes | `/clientes` | Listagem com score 0-1000 |
| Novo cliente | `/clientes/novo` | PF/PJ + garantias + contrato |
| Cobranças | `/cobrancas` | Disparo em massa via WhatsApp |
| Atividades | `/atividades` | Log de pagamentos, acordos, contatos |
| Simulador | `/simulador` | Simples, Composto, Price/SAC + CET |
| Calendário | `/calendario` | Grid mensal com indicadores |
| Financeiro | `/financeiro` | Contas a pagar internas |
| Relatórios | `/relatorios` | KPIs, adimplência, ranking |
| Equipe | `/equipe` | Membros e roles |
| Configurações | `/configuracoes` | Perfil, empresa, WhatsApp, templates, Agente IA |

## Score de Crédito (0-1000, estilo Serasa)

| Faixa | Classificação |
|-------|--------------|
| 851-1000 | Excelente |
| 701-850 | Bom |
| 501-700 | Regular |
| 301-500 | Alto Risco |
| 0-300 | Muito Alto Risco |

Score inicial: 500. Recalculado automaticamente após cada pagamento.

## Tipos de Operação

1. Empréstimo Padrão (datas flexíveis)
2. Empréstimo Diário (fluxo rápido)
3. Desconto de Cheque (cheque pré-datado como garantia)
4. Renovação (empréstimo existente + nova taxa)
5. Venda Parcelada (produto/veículo com custo e margem)
6. Aluguel/Contrato (mensalidade recorrente sem data fim)
7. Assinatura IPTV (micro-recorrência com alerta de vencimento)

## Modal de Pagamento — 3 Modos

1. **Completo** — Principal + Juros (normal)
2. **Somente Juros** — Adia principal para próxima parcela (status PARCIAL)
3. **Quitação Total** — Saldo devedor com slider de desconto negociado (0-30%)

## WhatsApp

- URL 1-clique: `https://wa.me/{phone}?text={mensagem_codificada}`
- Funciona sem Evolution API (deep link nativo)
- Evolution API para disparo em massa (configurar em /configuracoes)

## Estrutura de pastas relevante

```
src/
  app/
    (auth)/login, register  ← telas públicas de auth
    dashboard/              ← painel principal
    emprestimos/novo/       ← wizard 4 steps, 7 tipos
    clientes/novo/          ← cadastro PF/PJ expandido
    cobrancas/              ← disparo WhatsApp em massa
    atividades/             ← log de atividades/pagamentos
    configuracoes/          ← abas: perfil, empresa, WhatsApp, templates, agente IA
  lib/
    store.ts                ← in-memory store (trocar por Prisma para produção)
    score/calcularScore.ts  ← algoritmo 0-1000
    calculo/juros.ts        ← Simples, Composto, Price/SAC
  components/
    shared/Sidebar, Topbar, AppLayout
    clientes/ScoreGauge     ← speedômetro visual
    emprestimos/ModalPagamento ← 3 modos de pagamento
    cobrancas/CobrancasClient
    atividades/NovaAtividadeForm
    configuracoes/ConfiguracoesClient
  public/
    logo-zap-semfundo.png   ← logo com fundo transparente (topbar)
    logo-icon.png           ← ícone circular (sidebar)
    favicon.ico, favicon-32.png, apple-touch-icon.png
```

## Git

Repositório: git@github.com:Kaiooosz/zap-emprestimos.git

```bash
git remote add origin git@github.com:Kaiooosz/zap-emprestimos.git
git branch -M main
git push -u origin main
```

NUNCA commitar:
- `.env.local` (credenciais Neon, secrets)
- `node_modules/`
- `.next/`

## Pontos em Aberto (a definir)

- No parcelado com abatimento: recalcular valor das parcelas futuras OU reduzir número de parcelas?
- O excedente retido (Mod.2) tem prazo de validade?
- Limite de renovações na Modalidade 1?
- Como funciona a quitação antecipada total no parcelado (desconto automático)?
