# Prompt para o Agente — Regras de Negócio Zap Empréstimos

---

## CONTEXTO

Você é o agente responsável por modelar e implementar as regras de negócio do sistema **Zap Empréstimos**, uma plataforma de gestão de empréstimos pessoais operada via WhatsApp. Seu papel é garantir que toda lógica financeira, de cobrança e de projeção esteja corretamente definida antes de qualquer implementação técnica.

---

## REGRAS DE NEGÓCIO PRINCIPAIS

### 1. Modalidade 1 — Empréstimo Mensal com Juros Rolável

O cliente toma um valor e tem 1 mês para quitar. No vencimento, ele tem três opções:

**Opção A — Liquidação total:**
- Paga o principal + juros mensais (ex: R$10.000 + 30% = R$13.000)
- Dívida encerrada

**Opção B — Paga somente os juros (renovação):**
- Paga apenas o valor dos juros (ex: R$3.000)
- Principal continua intacto (R$10.000)
- Dívida é adiada por mais 1 mês com as mesmas condições

**Opção C — Abatimento parcial do principal:**
- Cliente paga os juros + parte do principal
- Sistema separa: quanto vai para os juros × quanto abate o principal
- Novo saldo devedor = principal anterior − valor abatido
- Juros do próximo mês incidem sobre o novo saldo devedor
- Percentual de quitação da dívida é atualizado

**Regra de separação de pagamento:**
```
Pagamento recebido:
  1. Primeiro cobre os juros devidos
  2. O restante abate o principal
  3. Atualiza saldo devedor
  4. Recalcula juros futuros sobre o novo saldo
```

---

### 2. Modalidade 2 — Parcelado com Taxa Personalizada

O cliente toma um valor e parcela em N meses. Taxa configurada por perfil × prazo.

**Regras de pagamento:**
- Pagamento exato da parcela → registra parcela como paga, avança para a próxima
- Pagamento abaixo da parcela → registra inadimplência parcial, aplica juros de atraso sobre o saldo faltante
- Pagamento acima da parcela → excedente é **retido** e descontado automaticamente na próxima parcela (não abate o principal diretamente, a não ser que o cliente solicite explicitamente)

**Abatimento do principal no parcelado (quando solicitado):**
- Sistema separa: quanto cobre a parcela × quanto é excedente destinado ao principal
- Atualiza saldo devedor
- Recalcula percentual de quitação
- (Ponto em aberto: recalcular valor das parcelas futuras ou reduzir número de parcelas)

---

### 3. Juros de Atraso

Aplicado por dia de inadimplência. Configurado por admin por perfil de cliente.

**Dois modos disponíveis (toggle por perfil):**

**Regra A — Base: parcela inteira:**
```
Juros de atraso = Valor total da parcela × % diário × dias em atraso
```

**Regra B — Base: saldo restante da parcela:**
```
Juros de atraso = (Valor da parcela − Valor já pago) × % diário × dias em atraso
```

- % diário padrão: 1% (configurável por perfil)
- Aplica a partir do primeiro dia após o vencimento
- Cobrado sobre cada dia até o pagamento

---

### 4. Liquidação — Fluxo de Processamento

Ao receber qualquer pagamento, o sistema deve:

```
1. Identificar o contrato e a parcela/vencimento em aberto
2. Verificar se há atraso → calcular juros de atraso acumulados
3. Separar o valor recebido:
     a) Cobre os juros de atraso (se houver)
     b) Cobre a parcela devida (juros mensais + principal, conforme modalidade)
     c) O excedente vai para:
          → Modalidade 1: abate o principal
          → Modalidade 2: retém para próxima parcela
4. Atualizar saldo devedor
5. Atualizar percentual de quitação (%)
6. Registrar histórico do pagamento
7. Verificar se a dívida foi totalmente liquidada
```

---

### 5. Projeções Financeiras da Empresa

O sistema deve fornecer ao operador:

**Volume em campo:**
- Soma de todos os saldos devedores ativos em tempo real

**Lucro projetado:**
- Total de juros a receber de todos os contratos ativos
- Discriminado por data: hoje / este mês / próximos meses

**Agenda de recebimentos:**
- Listagem cronológica por data de vencimento
- Para cada vencimento: valor esperado = juros + principal (se liquidação) + juros de atraso acumulados

---

### 6. Cobranças Automáticas

- Disparadas quando o cliente não paga a parcela total no vencimento
- Sistema identifica:
  - Sem pagamento → aplica Regra A ou B conforme perfil, a partir do dia seguinte
  - Pagamento parcial → aplica juros sobre o saldo faltante (Regra B preferencial)
- Mensagem de cobrança via WhatsApp gerada automaticamente com:
  - Valor original da parcela
  - Juros de atraso acumulados até a data
  - Total atualizado a pagar

---

### 7. Configuração por Perfil de Cliente (Admin)

Cada perfil define:

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| Modalidades permitidas | Multi-seleção (1, 2 ou ambas) | Quais modalidades o cliente pode contratar |
| Taxa mensal de juros | % | Ex: 30% |
| Regra de atraso | Toggle (A ou B) | Base de cálculo dos juros de atraso |
| % de atraso por dia | % | Ex: 1% |
| Prazo máximo (Mod. 2) | Número de meses | Máximo de parcelas permitidas |

---

## TAREFA DO AGENTE

Com base nessas regras, você deve:

1. **Validar** se há inconsistências ou lacunas nas regras descritas
2. **Mapear** todas as entidades de dados necessárias (Contrato, Parcela, Perfil, Pagamento, etc.)
3. **Definir** os fluxos de decisão para cada situação de pagamento
4. **Identificar** os pontos em aberto que precisam de decisão antes da implementação:
   - No parcelado com abatimento: parcelas futuras são recalculadas em valor ou em quantidade?
   - O excedente retido tem prazo de validade?
   - A taxa de atraso (1%) é fixa ou configurável por perfil?
   - Existe limite de renovações na Modalidade 1?
   - Como funciona a quitação antecipada total no parcelado?
5. **Propor** o modelo de dados e os fluxos de processamento antes de implementar qualquer lógica

**Sempre confirme cada ponto em aberto com o responsável antes de prosseguir com a implementação.**

