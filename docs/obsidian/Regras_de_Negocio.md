# 📐 Regras de Negócio — Motor Financeiro do Zap Empréstimos

Este manual detalha o funcionamento lógico, as equações matemáticas e as regras de projeção que regem o motor financeiro do sistema. Ele foi formatado para integração perfeita ao Obsidian, suportando rendering nativo do MathJax.

---

## 1. Regimes de Capitalização e Juros

O sistema opera sob duas modalidades de cálculo de juros para geração do saldo devedor inicial dos contratos:

### A. Juros Simples (Flat)
A taxa de juros incide de forma direta e exclusiva sobre o capital inicial (principal) contratado, independentemente do prazo total da operação. O valor total de juros cobrado é fixado no momento da assinatura.
* **Fórmula de Juros Totais ($J$):**
  $$J = P \times i$$
* **Fórmula de Valor Total do Contrato ($V_{\text{total}}$):**
  $$V_{\text{total}} = P + J = P \times (1 + i)$$
* *Onde:*
  * $P$ = Valor Principal (Capital inicial emprestado)
  * $i$ = Taxa de Juros nominal do contrato (ex: 20% = 0.20)

> [!NOTE]
> Ajustado para que a taxa Flat seja linear alinhada com o principal, prevenindo a multiplicação indevida por parcelas quando for juro simples seco, de acordo com o modelo de negócios de taxas fechadas.

### B. Juros Simples por Parcela
A taxa de juros incide sobre o principal multiplicada pela quantidade de parcelas de forma nominal linear.
* **Fórmula de Juros Totais ($J$):**
  $$J = P \times i \times N$$
* **Fórmula de Valor Total do Contrato ($V_{\text{total}}$):**
  $$V_{\text{total}} = P + J = P \times (1 + i \times N)$$
* *Onde:*
  * $N$ = Número total de parcelas pactuadas.

---

## 2. Periodicidade de Contratos e Projeção de Datas

O sistema estende a projeção de vencimentos a quatro periodicidades fundamentais. O vencimento da primeira parcela inicia-se a partir de $D_{\text{inicio}}$ (Data de início do contrato):

| Periodicidade | Intervalo de Projeção | Fórmula de Próxima Parcela ($D_{k}$) |
| :--- | :--- | :--- |
| **Diário** | 1 dia corrido | $D_k = D_{\text{inicio}} + k \text{ dias}$ |
| **Semanal** | 7 dias corridos | $D_k = D_{\text{inicio}} + 7k \text{ dias}$ |
| **Quinzenal** | 15 dias corridos | $D_k = D_{\text{inicio}} + 15k \text{ dias}$ |
| **Mensal** | Avanço de mês comercial | $D_k = \text{AjusteMensal}(D_{\text{inicio}}, k)$ |

### Algoritmo de Avanço Mensal Inteligente
Para evitar estouros de data em meses de tamanho variável (como vencimentos programados para dias 29, 30 ou 31 que se projetam para fevereiro ou meses de 30 dias):
1. O motor calcula a nova data de vencimento provisória adicionando $k$ meses com `setMonth(venc.getMonth() + 1)`.
2. Se o dia resultante diferir do dia de vencimento original (ex: cadastrou dia 31, mas o próximo mês é abril e resulta em 01 de maio), o algoritmo retrocede o vencimento para o último dia do respectivo mês (ex: 30 de abril).
3. Evita que parcelas avancem irregularmente nos meses e estabiliza o fluxo de recebíveis na data fixada com o cliente.

---

## 3. Regras de Atraso e Juros Diários (Regra A vs Regra B)

Em caso de inadimplência (data atual maior que o vencimento da parcela e status diferente de `PAGO`), incidem juros diários. O operador pode configurar a forma de incidência desses juros:

### Regra A — Incidência sobre a Parcela Inteira
A taxa de juros de atraso diária incide sempre sobre o valor nominal total devido da parcela original, desconsiderando amortizações parciais efetuadas.
* **Base de Cálculo ($B$):**
  $$B = V_{\text{devido\_original}}$$
* **Juros de Atraso Acumulados ($J_{\text{atraso}}$):**
  $$J_{\text{atraso}} = B \times d_{\text{atraso}} \times i_{\text{atraso\_diario}}$$

### Regra B — Incidência sobre o Saldo Restante
A taxa de juros de atraso diária incide estritamente sobre o saldo devedor remanescente da parcela (descontando pagamentos parciais anteriores).
* **Base de Cálculo ($B$):**
  $$B = V_{\text{devido\_original}} - V_{\text{pago\_anterior}}$$
* **Juros de Atraso Acumulados ($J_{\text{atraso}}$):**
  $$J_{\text{atraso}} = B \times d_{\text{atraso}} \times i_{\text{atraso\_diario}}$$

> [!TIP]
> A taxa diária de atraso $i_{\text{atraso\_diario}}$ pode ser configurada como **Percentual (%)** ou como **Valor Fixo em Reais (R$)** por dia de atraso. Se for **Valor Fixo**, a base de cálculo é ignorada e os juros acumulam como:
> $$J_{\text{atraso}} = d_{\text{atraso}} \times \text{Valor\_Fixo}$$

---

## 4. Contratos Roláveis e Renovação Automática

Os contratos roláveis são projetados para durar indeterminadamente até que ocorra a liquidação do capital principal.
* **Parâmetro Inicial:** Travado obrigatoriamente com $N = 1$ parcela ativa.
* **Mecanismo de Renovação (Somente Juros):**
  * Quando o cliente efetua o pagamento de **"Somente Juros"**, a parcela vigente de número $n$ é alterada para o status `PAGO` (registrando o valor pago correspondente apenas aos juros).
  * O motor do sistema cria de forma automática e reativa a parcela de número $n + 1$ com status `PENDENTE`.
  * A nova data de vencimento é calculada estendendo o período do contrato com base na periodicidade (ex: +30 dias para mensal).
  * O saldo principal permanece integralmente devido no contrato ativo para o próximo ciclo de vencimento.
