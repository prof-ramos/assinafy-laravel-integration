# Integração da API Assinafy na ASOF

## 1. Objetivo

Este documento consolida uma proposta de integração da API Assinafy ao fluxo de ofícios e documentos da ASOF, com foco em:

- aderência à documentação oficial da Assinafy;
- consistência técnica para implantação em backend PHP/Laravel ou serviço intermediário;
- rastreabilidade administrativa e jurídica;
- separação clara entre o que está confirmado na documentação pública e o que ainda depende de homologação no sandbox.

---

## 2. Visão geral

A Assinafy disponibiliza uma API REST para gestão de documentos, signatários, assignments e webhooks. A documentação pública descreve a API como RESTful, com JSON como formato padrão de requisição e resposta, e autenticação por API Key ou Access Token.

Para a ASOF, o fluxo-alvo é:

1. gerar o ofício em DOCX;
2. revisar e aprovar internamente;
3. converter para PDF;
4. fazer upload do PDF na Assinafy;
5. criar ou reutilizar signatários;
6. solicitar assinatura;
7. acompanhar o status até conclusão;
8. baixar o artefato certificado e arquivar.

---

## 3. Ambientes

### 3.1 Base URLs

| Ambiente | URL base |
|---|---|
| Sandbox | `https://sandbox.assinafy.com.br/v1` |
| Produção | `https://api.assinafy.com.br/v1` |

### 3.2 Observação operacional

A documentação também referencia o ambiente de app/sandbox para criação de conta de teste e geração de credenciais. Na ASOF, a recomendação é:

- desenvolver e homologar primeiro no sandbox;
- manter credenciais, banco e logs segregados por ambiente;
- só promover para produção após validar o fluxo completo de upload → assignment → assinatura → certificação → download.

---

## 4. Autenticação

A documentação pública confirma três formas de autenticação:

1. `X-Api-Key: {api_key}`
2. `Authorization: Bearer {access_token}`
3. `?access-token={access_token}`

### Diretriz para a ASOF

Adotar **API Key em backend** como padrão da integração sistema-a-sistema.

### Regras mínimas

- nunca expor API Key no frontend;
- nunca versionar credenciais em repositório;
- usar variáveis de ambiente ou secret manager;
- rotacionar chaves periodicamente;
- manter conta técnica exclusiva para integração, com menor privilégio possível.

---

## 5. Observação importante sobre `account_id`

A documentação pública **não usa `account_id` de forma uniforme em todos os recursos**.

### Confirmado na documentação

Usam `account_id`:

- `POST /accounts/{account_id}/signers`
- `GET /accounts/{account_id}/signers`
- `GET /accounts/{account_id}/signers/{signer_id}`
- `PUT /accounts/{account_id}/signers/{signer_id}`
- `GET /accounts/{account_id}/documents`
- `POST /accounts/{account_id}/documents`
- endpoints de webhooks por conta

Não usam `account_id` nos exemplos principais:

- `GET /documents/{document_id}`
- `GET /documents/{document_id}/download/{artifact_name}`
- `POST /documents/{document_id}/assignments`

### Diretriz documental

No texto técnico da ASOF, não padronizar artificialmente todos os endpoints com `account_id`. O ideal é documentar cada rota conforme a referência oficial pública e confirmar no sandbox qualquer variante adicional aceita.

---

## 6. Fluxo funcional mínimo da ASOF

1. Criar ou localizar o signatário.
2. Fazer upload do PDF.
3. Aguardar o documento ficar pronto para assinatura.
4. Criar o assignment.
5. Receber atualizações por webhook ou consultar status.
6. Quando o documento estiver certificado, baixar o artefato final.
7. Arquivar o documento e registrar evidências no sistema interno.

---

## 7. Endpoints principais

## 7.1 Signatários

### Criar signatário

```http
POST /accounts/{account_id}/signers
Content-Type: application/json
X-Api-Key: {api_key}

{
  "full_name": "Nome Completo",
  "email": "email@exemplo.com",
  "whatsapp_phone_number": "5548999990000"
}
```

### Listar signatários

```http
GET /accounts/{account_id}/signers
Authorization: Bearer {access_token}
```

### Consultar signatário

```http
GET /accounts/{account_id}/signers/{signer_id}
Authorization: Bearer {access_token}
```

### Atualizar signatário

```http
PUT /accounts/{account_id}/signers/{signer_id}
Content-Type: application/json
Authorization: Bearer {access_token}

{
  "full_name": "Nome Atualizado",
  "email": "novo@email.com"
}
```

### Observação importante

Segundo a documentação, um signatário só pode ser atualizado enquanto **não estiver associado a documento ativo**. Isso deve ser refletido na regra de negócio interna.

### Diretrizes internas

- persistir `assinafy_signer_id`;
- validar e-mail e telefone antes do envio;
- evitar duplicidade por e-mail + nome + CPF/CNPJ, quando esse dado existir na camada interna.

---

## 7.2 Documentos

### Listar documentos da conta

```http
GET /accounts/{account_id}/documents?page=1&per-page=25&search=termo&status=pending_signature&method=virtual
Authorization: Bearer {access_token}
```

### Upload de documento

```http
POST /accounts/{account_id}/documents
Content-Type: multipart/form-data
X-Api-Key: {api_key}

file=@/caminho/documento.pdf
```

### Consultar documento

```http
GET /documents/{document_id}
Authorization: Bearer {access_token}
```

### Download de artefato

```http
GET /documents/{document_id}/download/{artifact_name}
Authorization: Bearer {access_token}
```

### Tipos de artefato documentados

- `original`
- `certificated`
- `certificate-page`
- `bundle`

### Status documentados

- `uploading`
- `uploaded`
- `metadata_processing`
- `metadata_ready`
- `expired`
- `certificating`
- `certificated`
- `rejected_by_signer`
- `pending_signature`
- `rejected_by_user`
- `failed`

### Endpoint útil para enumeração oficial de status

```http
GET /documents/statuses
Authorization: Bearer {access_token}
```

### Regras para a ASOF

- o nome do arquivo deve ser padronizado antes do upload;
- persistir `assinafy_document_id`, nome do arquivo, status e timestamps;
- usar `metadata_ready` como marco técnico para liberar criação de assignment, quando o fluxo exigir garantia de processamento concluído;
- arquivar preferencialmente `bundle` ou `certificated`, conforme política interna.

---

## 7.3 Assignments

## Método `virtual` — sem campos de input

### Endpoint documentado

```http
POST /documents/{document_id}/assignments
Content-Type: application/json
Authorization: Bearer {access_token}
```

### Payload recomendado

```json
{
  "method": "virtual",
  "signers": [
    { "id": "signer_id_1" },
    { "id": "signer_id_2" }
  ],
  "message": "Por favor, assine este documento.",
  "expires_at": "2026-12-31T23:59:59Z"
}
```

### Observações técnicas

- a documentação atual recomenda `signers`;
- `signer_ids` aparece como **legado** e não deve ser o padrão em código novo;
- a documentação usa `expires_at` nos parâmetros, ainda que alguns exemplos antigos exibam `expiration`.

## Método `collect` — com campos de input

### Endpoint documentado

```http
POST /documents/{document_id}/assignments
Content-Type: application/json
Authorization: Bearer {access_token}
```

### Payload-base documentado

```json
{
  "method": "collect",
  "signers": [
    { "id": "signer_id_1" },
    { "id": "signer_id_2" }
  ],
  "entries": [
    {
      "page_id": "page_id_1",
      "fields": [
        {
          "signer_id": "signer_id_1",
          "field_id": "field_id_assinatura",
          "display_settings": {
            "left": 69,
            "top": 282,
            "fontFamily": "Arial",
            "fontSize": 18,
            "backgroundColor": "rgb(185, 218, 255)"
          }
        }
      ]
    }
  ],
  "expires_at": "2026-12-31T23:59:59Z"
}
```

### Consequência prática

O método `collect` **não deve ser descrito como simples troca de `method`**. Ele demanda montagem de `entries`, `page_id`, `field_id` e configurações de exibição.

---

## 8. Diretriz jurídica para uso de `virtual`

O método `virtual` deve ser tratado como mecanismo de assinatura automatizada em fluxo controlado, e não como substituto genérico de manifestação inequívoca de vontade.

### Uso aceitável na ASOF

- documentos internos padronizados;
- fluxos com autorização formal prévia;
- situações em que a identidade e a autorização do signatário estejam controladas por procedimento administrativo interno;
- existência de ato normativo interno, deliberação ou política aprovada que autorize esse modelo.

### Uso a evitar como padrão

- documentos com efeitos externos relevantes;
- instrumentos com maior risco jurídico;
- situações que exijam evidência reforçada de participação ativa do signatário.

### Regra recomendada

- `virtual`: somente em fluxos internos de baixo ou médio risco e com governança formal;
- `collect`: padrão preferencial para documentos sensíveis, externos ou com maior potencial de contestação.

---

## 9. Webhooks

A documentação pública da Assinafy possui API própria de webhooks.

### Endpoints documentados

```http
GET /accounts/{account_id}/webhooks/subscriptions
PUT /accounts/{account_id}/webhooks/subscriptions
PUT /accounts/{account_id}/webhooks/inactivate
GET /webhooks/event-types
GET /accounts/{account_id}/webhooks
POST /accounts/{account_id}/webhooks/{dispatch_id}/retry
```

### Eventos exemplificados/documentados

- `document_prepared`
- `document_metadata_ready`
- `document_ready`
- `document_uploaded`
- `signature_requested`
- `signer_created`
- `signer_email_verified`
- `signer_signed_document`
- `signer_rejected_document`
- `signer_viewed_document`
- `document_processing_failed`

### Diretriz para a ASOF

Usar webhook como mecanismo principal de atualização de status em produção.

### Boas práticas

- expor endpoint interno exclusivo para Assinafy;
- validar origem e segredo conforme o mecanismo efetivamente suportado na conta;
- responder `200 OK` rapidamente;
- processar o payload de forma idempotente;
- persistir histórico bruto e histórico normalizado;
- consultar a fila de dispatches para auditoria e reprocessamento.

### Observação importante

A documentação pública menciona `webhookSecret` no SDK e descreve endpoints de assinatura/subscrição, mas o mecanismo exato de verificação da origem do callback deve ser homologado no sandbox antes de produção.

---

## 10. Modelagem mínima de banco de dados

## 10.1 Tabela `signers`

- `id`
- `assinafy_signer_id`
- `full_name`
- `email`
- `whatsapp_phone_number`
- `document_number` (se a ASOF armazenar CPF/CNPJ internamente)
- `created_at`
- `updated_at`

## 10.2 Tabela `documents`

- `id`
- `assinafy_document_id`
- `processo_id` ou `oficio_id`
- `title`
- `file_name`
- `status`
- `signature_method`
- `hash_sha256_original`
- `hash_sha256_certificated`
- `expires_at`
- `certificated_at`
- `created_at`
- `updated_at`

## 10.3 Tabela `document_signers`

- `id`
- `document_id`
- `signer_id`
- `assinafy_assignment_item_id` (quando aplicável)
- `sign_order`
- `status`
- `signed_at`
- `rejected_at`
- `decline_reason`
- `created_at`
- `updated_at`

## 10.4 Tabela `document_status_history`

- `id`
- `document_id`
- `previous_status`
- `new_status`
- `source` (`polling`, `webhook`, `manual`)
- `payload_snapshot`
- `created_at`

## 10.5 Tabela `webhook_dispatches`

- `id`
- `account_id`
- `event`
- `external_dispatch_id`
- `endpoint`
- `delivered`
- `http_status`
- `response_body`
- `payload`
- `received_at`
- `processed_at`
- `error`

### Finalidade dessa modelagem

- rastrear o documento e seus signatários;
- manter auditoria de alterações de status;
- suportar reprocessamento seguro de eventos;
- permitir prova operacional do fluxo administrativo.

---

## 11. Segurança, logs e resiliência

### Controles mínimos

- API Key apenas em backend;
- mascaramento de credenciais em logs;
- timeout configurado;
- retry apenas para falhas transitórias;
- backoff exponencial para `429` e `5xx`;
- correlação por `request_id` interno;
- segregação de ambientes;
- auditoria de acesso às credenciais.

### Idempotência

Toda operação crítica deve ser idempotente.

### Regras práticas

- não reenviar upload se `assinafy_document_id` já existir para o mesmo arquivo/versionamento;
- não recriar assignment se já houver assignment ativo para o documento;
- deduplicar eventos de webhook por `external_dispatch_id` ou combinação equivalente;
- registrar hash do PDF para evitar duplicidade silenciosa.

---

## 12. Tratamento de erros

| Código | Situação | Diretriz |
|---|---|---|
| 400 | payload inválido | validar antes de chamar a API |
| 401 | credencial inválida | revisar API Key/token e ambiente |
| 403 | acesso negado | revisar permissões da conta técnica |
| 404 | recurso inexistente | conferir IDs e rota utilizada |
| 429 | excesso de chamadas | aplicar retry com backoff |
| 500 | falha interna | logar contexto e prever reprocessamento |

### Regra interna

Separar falhas em:

- **falhas de validação**;
- **falhas de autenticação/autorização**;
- **falhas transitórias**;
- **falhas de negócio**;
- **falhas externas permanentes**.

---

## 13. Uso do SDK oficial `assinafy/php-sdk`

## 13.1 Instalação

```bash
composer require assinafy/php-sdk
composer require guzzlehttp/guzzle
```

## 13.2 O que a documentação pública do SDK confirma

O repositório público mostra, entre outros pontos:

- requisito mínimo de PHP 7.4;
- criação de cliente com `apiKey`, `accountId` e `webhookSecret`;
- métodos para documentos e signatários;
- configuração de `baseUrl`, `timeout` e `connectTimeout`;
- suporte a logging PSR-3;
- tratamento de exceções próprias.

## 13.3 Padrão recomendado para a ASOF

Nunca chamar o SDK diretamente de controller.

### Estrutura sugerida

- `AssinafyService`
- `AssinafyDocumentRepository` (persistência local)
- `AssinafyWebhookService`
- `AssinafyMapper`
- `AssinafyExceptionTranslator`

### Exemplo conceitual de serviço

```php
<?php

final class AssinafyService
{
    public function __construct(
        private AssinafyClient $client,
        private LoggerInterface $logger,
    ) {}

    public function criarOuObterSignatario(array $dados): string
    {
        // 1. procurar internamente
        // 2. se não existir, criar na Assinafy
        // 3. persistir assinafy_signer_id
        // 4. retornar o ID externo
    }

    public function enviarDocumento(string $filePath, string $fileName): string
    {
        // upload e persistência local do document_id
    }

    public function aguardarDocumentoPronto(string $documentId): array
    {
        // polling controlado até metadata_ready / status equivalente esperado
    }

    public function solicitarAssinaturaVirtual(string $documentId, array $signerIds, ?string $message = null): array
    {
        // POST /documents/{document_id}/assignments
    }

    public function solicitarAssinaturaCollect(string $documentId, array $signers, array $entries, ?string $message = null): array
    {
        // payload com entries e display_settings
    }

    public function consultarDocumento(string $documentId): array
    {
        // GET /documents/{document_id}
    }

    public function baixarArtefato(string $documentId, string $artifact): string
    {
        // GET /documents/{document_id}/download/{artifact_name}
    }
}
```

### Benefícios desse padrão

- isolamento do fornecedor externo;
- menor acoplamento com controllers/jobs;
- reuso de tratamento de erros;
- facilitação de testes automatizados;
- troca futura de SDK por cliente HTTP sem impacto grande na aplicação.

---

## 14. Workflow operacional recomendado

1. gerar o ofício em DOCX;
2. aprovar internamente o conteúdo;
3. converter para PDF final;
4. calcular hash do PDF;
5. enviar para a Assinafy;
6. aguardar estado apto a assinatura;
7. montar assignment conforme o tipo:
   - `virtual` para fluxo interno formalizado;
   - `collect` para fluxo com evidência reforçada;
8. monitorar via webhook;
9. ao atingir `certificated`, baixar `bundle` ou `certificated`;
10. recalcular hash do artefato arquivado;
11. registrar encerramento do fluxo no processo administrativo.

---

## 15. Itens que ainda precisam ser homologados no sandbox

Mesmo com base na documentação pública, estes pontos precisam de teste prático antes da ida para produção:

1. aceitação exata de variantes de endpoint com ou sem `account_id`;
2. payload mínimo aceito para `virtual` em sua versão atual;
3. comportamento exato de `expires_at` versus exemplos antigos com `expiration`;
4. mecanismo real de validação de webhook na conta da ASOF;
5. eventos efetivamente habilitados por padrão;
6. limites operacionais não explicitados publicamente além do tamanho máximo de arquivo;
7. estratégia ideal para esperar o documento ficar pronto (`metadata_ready`) sem gerar polling excessivo.

---

## 16. Conclusão

A integração proposta é viável e tecnicamente aderente à documentação pública da Assinafy, desde que a ASOF adote quatro premissas:

1. documentar os endpoints conforme a referência oficial, sem uniformização artificial de rotas;
2. restringir juridicamente o uso de `virtual`;
3. tratar webhooks como mecanismo principal de sincronização;
4. implantar persistência, auditoria, segurança e idempotência desde a primeira versão.

Com essas correções, a especificação fica adequada para servir como base de implementação, homologação em sandbox e posterior entrada em produção.