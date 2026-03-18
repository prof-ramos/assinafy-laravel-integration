# Checklist de Homologação Sandbox Assinafy

**Versão:** 1.0
**Data:** 18/03/2026
**Projeto:** Integração API Assinafy na ASOF

---

## Objetivo

Este checklist tem por objetivo validar todos os pontos críticos da integração com a Assinafy no ambiente sandbox antes da implantação em produção.

---

## Itens de Homologação

### 1. ✅ Aceitação exata de variantes de endpoint com ou sem `account_id`

| Critério | Pass | Falha | Observações |
|----------|------|-------|-------------|
| `POST /accounts/{account_id}/documents` aceita upload | [ ] | [ ] | Testar com arquivo PDF válido |
| `POST /documents` (sem account_id) também funciona | [ ] | [ ] | Confirmar se endpoint alternativo é suportado |
| Retorno consistente entre endpoints | [ ] | [ ] | Comparar resposta estrutural |

**Status:** □ Pendente
**Responsável:** __________________
**Data Teste:** _______________

---

### 2. ✅ Payload mínimo aceito para `virtual` em sua versão atual

| Critério | Pass | Falha | Observações |
|----------|------|-------|-------------|
| Payload mínimo com apenas `method: "virtual"` | [ ] | [ ] | Testar sem campos obrigatórios implícitos |
| `signers` como array de objetos com `id` | [ ] | [ ] | Confirmar formato exato esperado |
| `expires_at` no formato ISO 8601 | [ ] | [ ] | Validar timezone suportada |
| Mensagem opcional (`message`) | [ ] | [ ] | Testar com e sem campo |

**Status:** □ Pendente
**Responsável:** __________________
**Data Teste:** _______________

---

### 3. ✅ Comportamento exato de `expires_at` versus exemplos antigos com `expiration`

| Critério | Pass | Falha | Observações |
|----------|------|-------|-------------|
| `expires_at` é o parâmetro atual | [ ] | [ ] | Confirmar documentação mais recente |
| Validação de data mínima/máxima | [ ] | [ ] | Testar datas passadas e futuras |
| Comportamento quando expira | [ ] | [ ] | Observar mudança de status para `expired` |
| Tratamento de timezone | [ ] | [ ] | Verificar se converte para UTC automaticamente |

**Status:** □ Pendente
**Responsável:** __________________
**Data Teste:** _______________

---

### 4. ✅ Mecanismo real de validação de webhook na conta da ASOF

| Critério | Pass | Falha | Observações |
|----------|------|-------|-------------|
| WebhookSecret configurado na conta | [ ] | [ ] | Confirmar campo disponível |
| Validação de HMAC/assaturação | [ ] | [ ] | Testar com payload assinado |
| Header de assinatura identificado | [ ] | [ ] | Verificar nome do header (ex: `X-Webhook-Signature`) |
| Formato do valor assinado | [ ] | [ ] | Confirmar se é HMAC hex ou outro formato |

**Status:** □ Pendente
**Responsável:** __________________
**Data Teste:** _______________

---

### 5. ✅ Eventos efetivamente habilitados por padrão

| Critério | Pass | Falha | Observações |
|----------|------|-------|-------------|
| `document_prepared` | [ ] | [ ] | Disparado após upload |
| `document_metadata_ready` | [ ] | [ ] | Indica processamento concluído |
| `signature_requested` | [ ] | [ ] | Após criação de assignment |
| `signer_signed_document` | [ ] | [ ] | Confirma assinatura individual |
| `document_certificated` | [ ] | [ ] | Status final do documento |
| Eventos não documentados | [ ] | [ ] | Listar quais ocorrem |

**Status:** □ Pendente
**Responsável:** __________________
**Data Teste:** _______________

---

### 6. ✅ Limites operacionais não explicitados publicamente

| Critério | Pass | Falha | Observações |
|----------|------|-------|-------------|
| Concurrent requests simultâneas | [ ] | [ ] | Testar chamadas paralelas |
| Taxa limite (RPM) real | [ ] | [ ] | Medir até receber 429 |
| Timeout de processamento | [ ] | [ ] | Medir tempo de upload → ready |
| Tamanho máximo de assignment | [ ] | [ ] | Testar com muitos signatários |
| Persistência de dados temporários | [ ] | [ ] | Verificar retenção de documentos |

**Status:** □ Pendente
**Responsável:** __________________
**Data Teste:** _______________

---

### 7. ✅ Estratégia ideal para esperar `metadata_ready` sem polling excessivo

| Critério | Pass | Falha | Observações |
|----------|------|-------|-------------|
| Intervalo polling adequado | [ ] | [ ] | Testar diferentes intervalos |
| Timeout máximo aceitável | [ ] | [ ] | Medir tempo total processamento |
| Evento `document_metadata_ready` via webhook | [ ] | [ ] | Confirmar disparo automático |
| Cancellation automática após timeout | [ ] | [ ] | Testar tratamento de falha |
| Retry para falhas temporárias | [ ] | [ ] | Validar backoff exponencial |

**Status:** □ Pendente
**Responsável:** __________________
**Data Teste:** _______________

---

## Checklist Geral

- [ ] Todos os 7 itens críticos foram testados
- [ ] Casos de erro foram documentados
- [ ] Performance foi avaliada
- [ ] Integração com backend foi validada
- [ ] Webhooks estão funcionando
- [ ] Model de dados suporta cenários
- [ ] Documentação técnica foi atualizada

---

## Conclusão e Próximos Passos

### Resumo dos Resultados

| Item | Status | Impacto |
|------|--------|---------|
| Endpoint variants | | |
| Virtual payload | | |
| Expires_at behavior | | |
| Webhook validation | | |
| Eventos habilitados | | |
| Limites operacionais | | |
| Polling strategy | | |

### Próximos Passos

□ Finalizar correções baseadas em resultados
□ Atualizar documentação técnica
□ Executar teste de integração completo
□ Preparar check-list para produção
□ Agendar deployment

---

## Assinaturas

| Função | Nome | Assinatura | Data |
|--------|------|------------|------|
| QA Tester | | | |
| Desenvolvedor | | | |
| Product Owner | | | |
| Tech Lead | | | |

---

## Área de Anotações e Findings

### Registros Teste 1
-
-

### Registros Teste 2
-
-

### Problemas Encontrados
-
-

### Soluções Implementadas
-
-

### Observações Técnicas
-
-

---

*Checklist gerado com base na especificação de integração v1.0*