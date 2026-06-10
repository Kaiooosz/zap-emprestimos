# Documentação de APIs — Zap Empréstimos

Esta documentação detalha as rotas de API públicas e privadas do sistema **Zap Empréstimos**, especificando métodos, parâmetros, propósitos e payloads.

---

## 🔑 1. Autenticação (`/api/auth`)

### `POST /api/auth/login`
* **Propósito**: Autentica o usuário e define um cookie de sessão seguro com token JWT.
* **Payload de Entrada**:
  ```json
  {
    "email": "admin@zap.com",
    "senha": "senha_secreta"
  }
  ```
* **Resposta (Sucesso - 200)**:
  ```json
  { "ok": true }
  ```

### `POST /api/auth/logout`
* **Propósito**: Remove o cookie de sessão do usuário (desconexão).
* **Resposta (Sucesso - 200)**:
  ```json
  { "ok": true }
  ```

### `GET /api/auth/me`
* **Propósito**: Retorna os dados do usuário autenticado no momento.
* **Resposta (Sucesso - 200)**:
  ```json
  {
    "id": "singleton-user-id",
    "nome": "Admin Zap",
    "email": "admin@zap.com"
  }
  ```

---

## 👥 2. Clientes (`/api/clientes`)

### `GET /api/clientes`
* **Propósito**: Retorna a listagem de todos os clientes cadastrados.
* **Resposta (Sucesso - 200)**:
  ```json
  [
    {
      "id": "cliente-uuid",
      "nome": "João da Silva",
      "cpf": "123.456.789-00",
      "phone": "+5511999999999",
      "score": 500,
      "createdAt": "2026-06-10T12:00:00.000Z"
    }
  ]
  ```

### `POST /api/clientes`
* **Propósito**: Registra um novo devedor (PF ou PJ).
* **Payload de Entrada**:
  ```json
  {
    "nome": "João da Silva",
    "cpf": "123.456.789-00",
    "phone": "+5511999999999",
    "endereco": "Rua Principal, 123",
    "cidade": "São Paulo",
    "estado": "SP",
    "garantias": "Veículo seminovo como garantia fiduciária"
  }
  ```

---

## 🛠️ 3. Configurações (`/api/configuracoes`)

### `POST /api/configuracoes/taxas`
* **Propósito**: Salva a tabela com as taxas personalizadas de juros para parcelamento (quantidade de parcelas mapeadas para percentual).
* **Payload de Entrada**:
  ```json
  {
    "2": 45,
    "3": 60,
    "4": 75,
    "5": 90,
    "6": 105
  }
  ```

### `POST /api/configuracoes/notificacoes`
* **Propósito**: Persiste as diretrizes de Notificações Automáticas e horários de disparo.
* **Payload de Entrada**:
  ```json
  {
    "resumoDiario": { "ativo": true, "horario": "07:00", "templateId": "template-1" },
    "lembrete3dias": { "ativo": true, "horario": "09:00", "templateId": "template-2" }
  }
  ```

### `POST /api/configuracoes/templates`
* **Propósito**: Atualiza o corpo de texto de um template de mensagem de cobrança via WhatsApp.
* **Payload de Entrada**:
  ```json
  {
    "id": "template-id",
    "conteudo": "Olá, {{nome}}. Identificamos que a parcela {{numero}} de {{valor}} com vencimento em {{vencimento}} encontra-se pendente de pagamento."
  }
  ```

### `POST /api/configuracoes/whatsapp`
* **Propósito**: Persiste os parâmetros de conexão do WhatsApp (Evolution API) e a URL do Webhook de destino.
* **Payload de Entrada**:
  ```json
  {
    "apiUrl": "http://localhost:8080",
    "apiKey": "minha-key",
    "instance": "instancia-zap",
    "numeroBusiness": "+5511999990000",
    "webhookUrl": "https://meu-sistema.com/api/webhook"
  }
  ```

### `POST /api/configuracoes/empresa`
* **Propósito**: Salva os dados cadastrais da empresa e as taxas/limites operacionais globais.
* **Payload de Entrada**:
  ```json
  {
    "razaoSocial": "Zap Empréstimos LTDA",
    "nomeFantasia": "Zap Empréstimos",
    "cnpj": "00.000.000/0001-00",
    "telefone": "(11) 99000-0000",
    "email": "contato@zap.com",
    "endereco": "Rua das Finanças, 100",
    "taxaJurosPadrao": 10,
    "limiteEmprestimoMin": 200,
    "limiteEmprestimoMax": 50000
  }
  ```

---

## 💰 4. Empréstimos (`/api/emprestimos`)

### `POST /api/emprestimos`
* **Propósito**: Cria um contrato de empréstimo e gera seu respectivo plano de amortização/parcelas.
* **Payload de Entrada**:
  ```json
  {
    "clienteId": "cliente-uuid",
    "valorPrincipal": 10000,
    "taxaJuros": 30,
    "numParcelas": 6,
    "tipo": "MENSAL",
    "dataInicio": "2026-06-10"
  }
  ```

---

## 🧾 5. Parcelas e Liquidação (`/api/parcelas`)

### `POST /api/parcelas/[id]/pagar`
* **Propósito**: Registra a liquidação/recebimento de pagamento de uma parcela de empréstimo. Executa o algoritmo financeiro (separação de principal, juros contratuais, juros de atraso) e atualiza o Score de Crédito do cliente.
* **Payload de Entrada**:
  ```json
  {
    "valorPago": 13000,
    "modoPagamento": "COMPLETO", // Opções: COMPLETO, SOMENTE_JUROS, QUITACAO_TOTAL
    "desconto": 0, // Utilizado para modo QUITACAO_TOTAL
    "dataPagamento": "2026-06-10"
  }
  ```

---

## 🚪 6. Contas a Pagar (`/api/financeiro`)

### `POST /api/financeiro`
* **Propósito**: Registra uma conta a pagar de custo operacional do escritório.
* **Payload de Entrada**:
  ```json
  {
    "descricao": "Hospedagem de Servidores",
    "categoria": "TECNOLOGIA", // ALUGUEL, SALARIO, IMPOSTO, MARKETING, TECNOLOGIA, OUTROS
    "valor": 1500,
    "dataVencimento": "2026-06-25",
    "recorrente": true
  }
  ```

### `POST /api/financeiro/[id]/pagar`
* **Propósito**: Executa a baixa da conta a pagar, marcando-a como liquidada (`PAGO`) na data informada.
