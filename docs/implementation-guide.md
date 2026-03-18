# Assinafy API - PHP/Laravel Implementation Guide

## Overview

This guide provides a complete implementation reference for integrating the Assinafy API into PHP/Laravel applications.

**Target Flow:**
1. Generate document in DOCX format
2. Internal review and approval
3. Convert to PDF
4. Upload PDF to Assinafy
5. Create or reuse signers
6. Request signature
7. Monitor status via webhooks
8. Download certified artifact
9. Archive and record evidence

## Prerequisites

| Requirement | Minimum Version | Recommended |
|-------------|-----------------|-------------|
| PHP | 7.4 | 8.1+ |
| Laravel | 8.0 | 10.x / 11.x |
| Composer | 2.0 | Latest |
| MySQL | 5.7 | 8.0+ |

## Table of Contents

1. [Setup and Configuration](01-setup-and-configuration.md) - Environment setup
2. [SDK Integration](02-sdk-integration.md) - Installing the SDK
3. [Service Layer](03-service-layer.md) - Architecture and services
4. [Signers Management](04-signers-management.md) - Managing signers
5. [Document Upload](05-document-upload.md) - Uploading documents
6. [Signature Requests](06-signature-requests.md) - Virtual and collect methods
7. [Webhooks](07-webhooks-integration.md) - Webhook handling
8. [Database Schema](08-database-schema.md) - Migrations and models
9. [Error Handling](09-error-handling.md) - Error strategies
10. [Testing Strategy](10-testing-strategy.md) - Unit and integration tests
11. [Security Checklist](11-security-checklist.md) - Security best practices
12. [Deployment Checklist](12-deployment-checklist.md) - Production deployment

## Quick Start

```bash
composer require assinafy/php-sdk
```

Add to `.env`:
```env
ASSINAFY_API_KEY=your_api_key_here
ASSINAFY_ACCOUNT_ID=your_account_id_here
ASSINAFY_WEBHOOK_SECRET=your_webhook_secret_here
ASSINAFY_BASE_URL=https://sandbox.assinafy.com.br/v1
```

## API Environments

| Environment | Base URL |
|-------------|----------|
| Sandbox | `https://sandbox.assinafy.com.br/v1` |
| Production | `https://api.assinafy.com.br/v1` |

## Document Status Flow

```
uploading → uploaded → metadata_processing → metadata_ready
                                              ↓
                                    pending_signature
                                              ↓
                                    certificating → certificated
```
