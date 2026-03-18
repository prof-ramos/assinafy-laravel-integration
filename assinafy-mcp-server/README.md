# assinafy-mcp-server

Servidor MCP (Model Context Protocol) para integração com a API Assinafy de assinatura eletrônica, desenvolvido para a ASOF — Associação Nacional dos Oficiais de Chancelaria do Serviço Exterior Brasileiro.

## Ferramentas disponíveis

### Signatários
| Tool | Descrição |
|------|-----------|
| `assinafy_create_signer` | Criar signatário |
| `assinafy_list_signers` | Listar signatários com paginação |
| `assinafy_get_signer` | Consultar signatário por ID |
| `assinafy_update_signer` | Atualizar dados do signatário |

### Documentos
| Tool | Descrição |
|------|-----------|
| `assinafy_list_documents` | Listar documentos com filtros (status, método, busca) |
| `assinafy_get_document` | Consultar documento por ID |
| `assinafy_upload_document` | Upload de PDF (base64) |
| `assinafy_download_artifact` | Baixar artefato (original, certificated, certificate-page, bundle) |
| `assinafy_get_document_statuses` | Listar status possíveis |

### Assignments (Solicitações de assinatura)
| Tool | Descrição |
|------|-----------|
| `assinafy_create_virtual_assignment` | Criar assignment virtual (fluxo interno, baixo risco) |
| `assinafy_create_collect_assignment` | Criar assignment collect (campos posicionados, evidência reforçada) |

### Webhooks
| Tool | Descrição |
|------|-----------|
| `assinafy_list_webhook_subscriptions` | Listar assinaturas de webhook |
| `assinafy_get_webhook_event_types` | Listar tipos de evento disponíveis |
| `assinafy_list_webhook_dispatches` | Histórico de entregas de webhook |
| `assinafy_retry_webhook_dispatch` | Reenviar dispatch falhado |
| `assinafy_inactivate_webhooks` | Desativar todos os webhooks |

## Configuração

### Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `ASSINAFY_API_KEY` | Sim | API Key da conta Assinafy |
| `ASSINAFY_ACCOUNT_ID` | Sim | ID da conta Assinafy |
| `ASSINAFY_ENV` | Não | `sandbox` (padrão) ou `production` |
| `ASSINAFY_TIMEOUT_MS` | Não | Timeout em ms (padrão: 30000) |
| `TRANSPORT` | Não | `stdio` (padrão) ou `http` |
| `PORT` | Não | Porta HTTP (padrão: 3100, só para TRANSPORT=http) |

### Instalação e build

```bash
npm install
npm run build
```

### Execução

**stdio (padrão — para Claude Desktop, Claude Code, etc.):**
```bash
ASSINAFY_API_KEY=sk_xxx ASSINAFY_ACCOUNT_ID=acc_xxx node dist/index.js
```

**HTTP (para acesso remoto/multi-client):**
```bash
TRANSPORT=http ASSINAFY_API_KEY=sk_xxx ASSINAFY_ACCOUNT_ID=acc_xxx node dist/index.js
```

### Configuração no Claude Desktop

```json
{
  "mcpServers": {
    "assinafy": {
      "command": "node",
      "args": ["/caminho/para/assinafy-mcp-server/dist/index.js"],
      "env": {
        "ASSINAFY_API_KEY": "sk_xxx",
        "ASSINAFY_ACCOUNT_ID": "acc_xxx",
        "ASSINAFY_ENV": "sandbox"
      }
    }
  }
}
```

## Fluxo operacional ASOF

1. Criar/localizar signatário → `assinafy_create_signer` / `assinafy_list_signers`
2. Upload do PDF → `assinafy_upload_document`
3. Aguardar `metadata_ready` → `assinafy_get_document` (polling)
4. Criar assignment → `assinafy_create_virtual_assignment` ou `assinafy_create_collect_assignment`
5. Monitorar status → webhooks ou `assinafy_get_document`
6. Baixar artefato certificado → `assinafy_download_artifact`

### Diretriz ASOF para método de assinatura

- **virtual**: somente fluxos internos de baixo/médio risco com governança formal
- **collect**: padrão preferencial para documentos sensíveis, externos ou com risco de contestação

## Ambientes

| Ambiente | Base URL |
|----------|----------|
| Sandbox | `https://sandbox.assinafy.com.br/v1` |
| Produção | `https://api.assinafy.com.br/v1` |

## Segurança

- API Key trafega apenas no backend (header `X-Api-Key`)
- Nunca expor credenciais no frontend ou repositório
- Usar variáveis de ambiente ou secret manager
- Rotacionar chaves periodicamente
- Conta técnica exclusiva com menor privilégio possível

## Licença

Uso interno ASOF.
