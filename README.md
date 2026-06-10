# Zap Empréstimos ⚡

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-blue?style=flat-square&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4.0-38bdf8?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7.8-123a50?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![Neon Database](https://img.shields.io/badge/Neon-PostgreSQL-00e599?style=flat-square&logo=neon)](https://neon.tech/)
[![Jest Tests](https://img.shields.io/badge/Tests-Passed-brightgreen?style=flat-square&logo=jest)](https://jestjs.io/)

O **Zap Empréstimos** é uma plataforma moderna e completa de gestão, simulação e cobrança inteligente de empréstimos pessoais e comerciais. Projetado para rodar na web de forma responsiva, o sistema gerencia todo o ciclo de vida dos contratos — desde a simulação até a cobrança automatizada via WhatsApp e o controle operacional de equipes de venda.

---

## 🚀 Funcionalidades & Módulos

O sistema é dividido em módulos operacionais integrados:

### 1. Relatórios Financeiros 📊
* **KPIs Unificados e Seguros**: Exibição em tempo real de métricas cruciais sem duplicidade de dados:
  * **Capital na Rua**: Calculado com base no saldo devedor real das parcelas pendentes (não do valor inicial do contrato).
  * **Lucro Projetado**: Soma total dos juros em aberto esperados.
  * **Recebido no Mês**: Valores efetivamente pagos no mês vigente.
  * **Índice de Adimplência**: Relação percentual entre parcelas pagas no prazo e o total de vencidas.
* **Projeção Futura**: Tabela de projeção de fluxo de caixa mês a mês para os próximos 3 meses (distinguindo o retorno do principal e dos juros).
* **Agenda de Recebimento de 7 Dias**: Cronograma visual de vencimentos próximos com destaques dinâmicos para pagamentos no dia e atrasos.

### 2. Gestão de Equipe & Comissões 👥
* **Níveis de Acesso**: Suporte a múltiplos perfis operacionais com controle de permissão real via JWT:
  * **Administrador**: Acesso irrestrito a configurações, taxas e dados financeiros globais.
  * **Gerente**: Acesso a relatórios e gestão de carteira de clientes.
  * **Operador**: Permissões focadas em simulação, novos contratos e envio de cobranças.
* **Comissionamento Personalizado**: Configuração de taxa de comissão por membro da equipe, persistida diretamente em banco de dados e associada aos empréstimos criados.

### 3. Simulador Financeiro 🧮
Permite simular o plano de pagamentos baseado nas duas regras de negócio de empréstimo:
* **Modalidade 1 (Mensal com Renovação/Rolagem)**:
  * O cliente toma um valor principal (ex: R$ 10.000,00) com taxa de 30% ao mês.
  * No vencimento (ex: após 30 dias), ele tem três opções:
    1. **Quitação Total**: Paga R$ 13.000,00 e encerra o contrato.
    2. **Pagar Apenas os Juros (Rolagem)**: Paga R$ 3.000,00 para adiar o vencimento da dívida principal por mais 30 dias.
    3. **Abatimento Parcial**: Paga os juros (R$ 3.000,00) + um valor para amortizar o principal. Os juros de 30% do mês seguinte serão aplicados apenas sobre o saldo devedor restante.
* **Modalidade 2 (Parcelado Tradicional)**:
  * O cliente toma um valor e parcela em parcelas mensais com taxas de juros personalizadas dependendo do número de parcelas.
  * **Retenção de Excedentes**: Caso o cliente pague um valor maior que a parcela devida, o excedente é guardado no sistema e descontado automaticamente do valor da próxima parcela.

### 4. Cobrança Dinâmica & Integração WhatsApp 💬
* **Cálculo de Juros Diários de Atraso**: Aplicação de taxas de atraso dinâmicas configuradas por cliente de acordo com duas regras operacionais:
  * **Regra A**: Cobrança de 1% (ou taxa configurada) ao dia sobre o **valor integral da parcela**.
  * **Regra B**: Cobrança de 1% (ou taxa configurada) ao dia apenas sobre o **saldo devedor restante da parcela** (caso o cliente tenha feito pagamento parcial).
* **Mensagens Personalizáveis**: Modelos de mensagens de cobrança pré-configurados que suportam variáveis dinâmicas como `{{juros_atraso}}` e `{{regra_juros}}` para envio rápido direto pelo WhatsApp do operador.

### 5. Central de Notificações 🔔
* Painel de configuração de notificações com suporte a 6 eventos distintos (ex: Alerta de Vencimento de Parcela, Notificação de Atraso, Confirmação de Recebimento).
* Controle individual por toggle de status (Ativo/Inativo), definição de horários de disparo preferenciais e templates de mensagem vinculados.

---

## 🛠️ Stack Tecnológica

* **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Server Actions)
* **Linguagem**: [TypeScript](https://www.typescriptlang.org/)
* **Frontend UI**: [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [Base UI](https://base-ui.com/), [Lucide React](https://lucide.dev/) (ícones)
* **Banco de Dados**: [PostgreSQL](https://www.postgresql.org/) (hospedado no [Neon Database Serverless](https://neon.tech/))
* **ORM**: [Prisma ORM](https://www.prisma.io/)
* **Gráficos**: [Recharts](https://recharts.org/)
* **Testes**: [Jest](https://jestjs.io/) e [ts-jest](https://kulshekhar.github.io/ts-jest/)

---

## 📂 Estrutura do Projeto

```text
src/
├── __tests__/         # Suíte de testes unitários (Score, Juros e Liquidação)
├── app/               # Rotas e páginas do Next.js (App Router)
│   ├── (auth)/        # Telas de Autenticação (Login, Cadastro)
│   ├── api/           # Rotas de APIs internas
│   ├── relatorios/    # Painel de Relatórios
│   ├── equipe/        # Cadastro e Gestão de Equipes
│   ├── simulador/     # Simulador de Negociações
│   └── cobrancas/     # Painel de Inadimplência e Geração de Mensagens
├── components/        # Componentes UI reutilizáveis (gráficos, cards, etc.)
├── hooks/             # Custom React Hooks
├── lib/               # Lógica de negócios central e integrações
│   ├── auth.ts        # Utilitários e validações JWT
│   ├── calculo/       # Motores de cálculo financeiro (juros de atraso, liquidação)
│   ├── db/            # Conexões e adapters Prisma
│   └── score/         # Algoritmo de score de clientes
└── types/             # Definições de Tipos TypeScript globais
```

---

## ⚙️ Configuração & Instalação

### Pré-requisitos
* Node.js v18 ou superior
* Conta no Neon Database (ou qualquer PostgreSQL rodando)

### Passos para Configuração

1. **Clonar o Repositório**:
   ```bash
   git clone https://github.com/Kaiooosz/zap-emprestimos.git
   cd zap-emprestimos
   ```

2. **Instalar Dependências**:
   ```bash
   npm install
   ```

3. **Configurar as Variáveis de Ambiente**:
   Crie um arquivo `.env` na raiz do projeto com base nas seguintes variáveis:
   ```env
   # Link de conexão do banco de dados (Neon Database PostgreSQL)
   DATABASE_URL="postgresql://usuario:senha@neon-host/zap-db?sslmode=require"
   
   # Chave secreta de geração e validação de tokens JWT
   JWT_SECRET="sua_chave_secreta_aqui"
   ```

4. **Aplicar Migrations do Banco de Dados**:
   ```bash
   npx prisma db push
   ```

5. **Iniciar o Servidor de Desenvolvimento**:
   ```bash
   npm run dev
   ```
   Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

6. **Gerar Build de Produção**:
   ```bash
   npm run build
   ```

---

## 🧪 Rodando os Testes

O projeto contém uma suíte abrangente de testes unitários utilizando **Jest** para garantir a precisão matemática dos cálculos financeiros e do score de crédito.

Para rodar os testes:

```bash
# Executar todos os testes uma única vez
npm run test

# Executar os testes em modo watch (assistindo modificações de arquivo)
npm run test:watch
```

Os testes cobrem:
* **`juros.test.ts`**: Validação de juros de atraso diários (Regra A e Regra B).
* **`liquidacao.test.ts`**: Regras de quitação, amortizações de principal, rolagem de parcelas (Modalidade 1) e retenção de excedentes (Modalidade 2).
* **`calcularScore.test.ts`**: Avaliação de score do cliente (bônus por pagamentos consecutivos, penalidades por atraso, bônus de volume de pagamentos, etc.).
