# Zap Empréstimos — Regras de Negócio

> Documento de referência para o agente responsável pelo mapeamento e implementação das regras de negócio do sistema Zap Empréstimos.

---

## 1. Modalidades de Empréstimo

### 1.1 Modalidade 1 — Empréstimo Mensal com Renovação de Juros

**Conceito:**
O cliente toma um valor e tem exatamente 1 mês para quitar. No vencimento, ele pode:
- **Liquidar totalmente** (principal + juros)
- **Pagar apenas os juros** (rola a dívida por mais 1 mês)
- **Abater parte do principal** (juros do próximo mês incidem sobre o saldo restante)

**Exemplo base:**
```
Valor tomado:    R$ 10.000,00  (dia 05/06)
Vencimento:      05/07
Juros mensais:   30%
Valor dos juros: R$  3.000,00
Total p/ quitar: R$ 13.000,00
```

**Opções no vencimento:**

| Opção | O que o cliente paga | O que acontece |
|-------|---------------------|----------------|
| A — Liquidação total | R$ 13.000,00 | Dívida encerrada |
| B — Paga só os juros | R$  3.000,00 | Dívida adia 1 mês; principal permanece R$ 10.000 |
| C — Abatimento parcial | Juros + parte do principal | Saldo devedor reduzido; juros do próximo mês sobre o novo saldo |

**Regra de cálculo com abatimento:**
```
Saldo devedor após pagamento = Principal anterior − Valor abatido do principal
Juros próximo mês = Saldo devedor × taxa mensal (30%)
```

**Exemplo de abatimento:**
```
Principal:           R$ 10.000,00
Cliente paga:        R$  5.000,00 (R$ 3.000 juros + R$ 2.000 abate principal)
Novo saldo devedor:  R$  8.000,00
Juros próximo mês:   R$  2.400,00 (30% de R$ 8.000)
```

---

### 1.2 Modalidade 2 — Parcelado com Taxa Personalizada

**Conceito:**
O cliente toma um valor e parcela em N meses. A taxa é definida pelo admin de acordo com o **perfil do cliente** e a **quantidade de meses**.

**Regras:**
- Cada cliente tem um perfil com taxa associada
- O número de parcelas e a taxa são combinados na negociação
- O sistema gera um plano de pagamento com parcelas fixas (ou variáveis — a definir)

**Pagamento acima do valor da parcela:**
- O excedente **NÃO é descartado**
- Fica **retido/reservado** no sistema
- É descontado automaticamente na **próxima parcela**

**Exemplo:**
```
Parcela devida:   R$ 1.200,00
Cliente paga:     R$ 1.700,00
Excedente:        R$   500,00 → guardado para próxima parcela
Próxima parcela:  R$ 1.200,00 − R$ 500,00 = R$ 700,00 a pagar
```

**Abatimento do principal no parcelado:**
- Quando o cliente paga acima da parcela **e** não há excedente retido acumulado, o sistema verifica se há intenção de abate de principal
- Ao abater principal: recalcula o saldo devedor, atualiza o percentual de quitação da dívida e pode recalcular as parcelas futuras (regra a confirmar: parcelas menores ou mesmo número de parcelas com valor menor)

---

## 2. Liquidação e Atualização de Negociação

### 2.1 Fluxo de recebimento de pagamento

Ao receber qualquer valor pago pelo cliente, o sistema deve seguir esta ordem de aplicação:

```
1. Verificar modalidade (Mensal ou Parcelado)
2. Identificar o valor da parcela devida
3. Separar: quanto cobre a parcela  x  quanto é excedente
4. Aplicar o valor da parcela
5. Tratar o excedente conforme a modalidade:
   - Mensal:    abate o principal  → recalcula saldo devedor e juros futuros
   - Parcelado: retém o excedente  → aplica na próxima parcela
6. Atualizar percentual de quitação da dívida
7. Registrar histórico da transação
```

### 2.2 Cálculo do percentual de quitação

```
% Quitado = (Principal original − Saldo devedor atual) / Principal original × 100
```

---

## 3. Juros de Atraso

### 3.1 Regra de aplicação

- Juros de atraso são cobrados **por dia** de inadimplência.
- O percentual da taxa de juros diário de atraso é definido pelo administrador de acordo com o perfil do cliente cadastrado.
- Caso o cliente não pague a parcela total no vencimento, os juros de atraso diários incidem de acordo com duas regras de cálculo disponíveis:

| Regra | Base de cálculo | Descrição |
|-------|-----------------|-----------|
| Regra A | Valor da parcela (total) | A taxa diária do perfil incide sobre o valor integral da parcela |
| Regra B | Saldo restante da parcela | A taxa diária do perfil incide apenas sobre o valor restante/faltante da parcela (em caso de pagamento parcial) |

**Exemplo — Regra A (Taxa diária de 1%):**
```
Parcela devida:    R$ 1.200,00
Dias em atraso:    3
Juros de atraso:   R$ 1.200 × 1% × 3 = R$ 36,00
Total a pagar:     R$ 1.236,00
```

**Exemplo — Regra B (Taxa diária de 1%, cliente pagou R$ 400 da parcela e ficou devendo R$ 800):**
```
Saldo da parcela:  R$ 800,00
Dias em atraso:    3
Juros de atraso:   R$ 800 × 1% × 3 = R$ 24,00
Total a pagar:     R$ 824,00
```

### 3.2 Configuração por perfil (admin)

```
Perfil do cliente → define:
  - Modalidade de empréstimo permitida (1, 2 ou ambas)
  - Taxa mensal de juros (ex: 30%)
  - Regra de atraso (Regra A ou Regra B)
  - % do juros de atraso por dia definido pelo admin
```

---

## 4. Projeções e Visão Financeira da Empresa

### 4.1 Volume de Dinheiro na Rua (Capital em Campo)

- Soma total de capital principal emprestado que ainda não foi quitado pelos clientes.
- Atualizado em tempo real a cada pagamento recebido ou novo empréstimo concedido.

### 4.2 Lucro Projetado e Projeções

- Projeção do total de lucro que a empresa irá obter com base nos juros a receber dos contratos ativos.
- Exibe o valor do lucro esperado e as datas de quando cada retorno será obtido (hoje, este mês e projeções futuras para os próximos meses).

### 4.3 Agenda de recebimentos

- Listagem por data de vencimento de cada parcela/juros.
- Discrimina: principal esperado + juros esperados + juros de atraso acumulados (se houver).

---

## 5. Cobranças

- Disparadas quando o cliente não paga a parcela total no vencimento.
- O sistema calcula automaticamente os juros de atraso diários sobre o valor integral da parcela (Regra A) ou sobre o saldo restante (Regra B) conforme definido no perfil do cliente pelo admin.
- O disparo de cobrança enfileira a notificação na fila assíncrona com throttling seguro para envio via WhatsApp.

---

## 6. Glossário

| Termo | Definição |
|-------|-----------|
| Principal | Valor original tomado pelo cliente |
| Saldo devedor | Principal ainda não quitado |
| Juros mensais | % aplicado sobre o saldo devedor ao mês |
| Juros de atraso | % aplicado por dia de inadimplência definido por perfil |
| Abatimento | Pagamento que reduz o saldo devedor |
| Excedente | Valor pago acima da parcela devida |
| Perfil | Configuração do cliente (taxas, regras, de acordo com o perfil) |
| Liquidação | Quitação total da dívida |
| Renovação | Pagamento só de juros, rolando a dívida |

---

## 7. Decisões Consolidadas de Implementação

- **Juros de Atraso**: A taxa diária é 100% configurável pelo admin para cada perfil de cliente, incidindo sobre o valor total da parcela ou o restante conforme a regra selecionada.
- **Forma de Liquidação**: O recebimento de pagamentos atualiza a negociação separando o valor devido da parcela e o valor a mais. O excedente abate o saldo devedor (atualizando a porcentagem de quitação da dívida) na modalidade Mensal, e fica retido/seguro para descontar da próxima parcela na modalidade Parcelado.

