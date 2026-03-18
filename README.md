# Assinafy API Integration - Laravel

Documentação completa e código de exemplo para integração da API Assinafy em aplicações Laravel.

## 📋 Sobre

Este repositório contém a especificação OpenAPI, diagramas de arquitetura, migrations de banco de dados e guias de implementação para integrar a API de assinatura digital [Assinafy](https://assinafy.com.br) em aplicações Laravel/PHP.

## 📚 Conteúdo

### OpenAPI Specification
- [`openapi/assinafy-api.yaml`](openapi/assinafy-api.yaml) - Especificação OpenAPI 3.1 completa da API Assinafy

### Diagramas de Arquitetura
- [`diagrams/integration-context.mmd`](diagrams/integration-context.mmd) - Diagrama de Contexto C4
- [`diagrams/sequence-signature-flow.mmd`](diagrams/sequence-signature-flow.mmd) - Fluxo de Assinatura (Virtual/Collect)
- [`diagrams/sequence-webhook-flow.mmd`](diagrams/sequence-webhook-flow.mmd) - Processamento de Webhooks
- [`diagrams/state-machine-document.mmd`](diagrams/state-machine-document.mmd) - Máquina de Estados do Documento

### Documentação
- [`docs/01-setup-and-configuration.md`](docs/01-setup-and-configuration.md) - Configuração do ambiente
- [`docs/08-database-schema.md`](docs/08-database-schema.md) - Schema do banco de dados
- [`docs/11-security-checklist.md`](docs/11-security-checklist.md) - Checklist de segurança
- [`docs/12-deployment-checklist.md`](docs/12-deployment-checklist.md) - Checklist de deploy

### Código de Exemplo
- [`database/migrations/`](database/migrations/) - Migrations Laravel
- [`database/models/`](database/models/) - Models Eloquent

### Checklists
- [`sandbox-checklist.md`](sandbox-checklist.md) - Checklist de homologação
- [`integracao_da_api_assinafy_na_asof_versao_revisada.md`](integracao_da_api_assinafy_na_asof_versao_revisada.md) - Documentação original

## 🚀 Guia Rápido

### 1. Configuração

```bash
# Instale o SDK da Assinafy
composer require assinafy/php-sdk
```

```env
# .env
ASSINAFY_API_KEY=your_api_key_here
ASSINAFY_ACCOUNT_ID=your_account_id_here
ASSINAFY_WEBHOOK_SECRET=your_webhook_secret_here
ASSINAFY_ENV=sandbox
```

### 2. Execute as Migrations

```bash
php artisan migrate
```

### 3. Configure o Webhook

Registre seu webhook URL no painel Assinafy:
```
https://seu-dominio.com/api/webhooks/assinafy
```

## 📖 Recursos da API

### Operações Principais

| Recurso | Descrição |
|---------|-----------|
| `/documents` | Upload e gerenciamento de documentos |
| `/signers` | Cadastro de signatários |
| `/assignments` | Solicitação de assinaturas |
| `/webhooks` | Eventos de notificação |

### Métodos de Assinatura

- **Virtual** - Assinatura 100% digital com certificado ICP-Brasil
- **Collect** - Assinatura com biometria facial ou carteira digital

## 🔒 Segurança

- Validação de webhook signature (HMAC-SHA256)
- Rate limiting configurável
- Criptografia de dados sensíveis no banco
- Auditoria completa de operações

## 📞 Suporte

- **Assinafy:** [suporte@assinafy.com.br](mailto:suporte@assinafy.com.br)
- **Documentação:** [docs.assinafy.com.br](https://docs.assinafy.com.br)
- **Status:** [status.assinafy.com.br](https://status.assinafy.com.br)

## 📄 Licença

Este projeto é fornecido como código de exemplo para integração com a API Assinafy.

---

**Versão:** 1.0.0
**Última atualização:** Março 2026
