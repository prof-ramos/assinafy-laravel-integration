# SDK Integration

This section covers the installation and usage of the official Assinafy PHP SDK in your Laravel application.

## Installation

### Install via Composer

```bash
composer require assinafy/php-sdk
composer require guzzlehttp/guzzle
```

### Verify Installation

```bash
composer show assinafy/php-sdk
```

Expected output:
```
name     : assinafy/php-sdk
descrip. : Assinafy API PHP SDK
keywords : api, assinafy, php, sdk
versions : * 1.x.x
type     : library
```

## SDK Overview

The Assinafy PHP SDK provides:

- **Client Factory:** Simple client instantiation
- **API Resources:** Document, Signer, Webhook management
- **Authentication:** Built-in API Key and Bearer token support
- **PSR-3 Logging:** Compatible with Laravel's logging
- **Exception Handling:** Custom exception classes
- **Configurable:** Timeouts, base URLs, retry logic

## Client Factory

### Basic Client Creation

```php
use Assinafy\Client;

$client = new Client([
    'api_key' => config('assinafy.api_key'),
    'account_id' => config('assinafy.account_id'),
    'webhook_secret' => config('assinafy.webhook_secret'),
    'base_url' => config('assinafy.base_url')(),
]);
```

### Advanced Configuration

```php
use Assinafy\Client;
use Psr\Log\LoggerInterface;

$client = new Client([
    // Authentication
    'api_key' => config('assinafy.api_key'),
    'account_id' => config('assinafy.account_id'),
    'webhook_secret' => config('assinafy.webhook_secret'),

    // Endpoints
    'base_url' => config('assinafy.base_url')(),

    // Timeouts (seconds)
    'timeout' => 30,
    'connect_timeout' => 10,

    // Retry configuration
    'retry' => [
        'enabled' => true,
        'max_attempts' => 3,
        'backoff_multiplier' => 2,
    ],

    // Logger (optional)
    'logger' => app(LoggerInterface::class),
]);
```

## Client Factory Service

Create a dedicated factory for clean client instantiation:

```php
// app/Services/Assinafy/ClientFactory.php

namespace App\Services\Assinafy;

use Assinafy\Client;
use Illuminate\Contracts\Config\Repository;
use Psr\Log\LoggerInterface;

class ClientFactory
{
    public function __construct(
        private Repository $config,
        private LoggerInterface $logger
    ) {}

    public function create(): Client
    {
        return new Client([
            'api_key' => $this->config->get('assinafy.api_key'),
            'account_id' => $this->config->get('assinafy.account_id'),
            'webhook_secret' => $this->config->get('assinafy.webhook_secret'),
            'base_url' => $this->getBaseUrl(),
            'timeout' => $this->config->get('assinafy.timeout', 30),
            'connect_timeout' => $this->config->get('assinafy.connect_timeout', 10),
            'logger' => $this->logger,
        ]);
    }

    public function createForSandbox(): Client
    {
        return new Client([
            'api_key' => $this->config->get('assinafy.sandbox.api_key'),
            'account_id' => $this->config->get('assinafy.sandbox.account_id'),
            'webhook_secret' => $this->config->get('assinafy.sandbox.webhook_secret'),
            'base_url' => $this->config->get('assinafy.sandbox_url'),
            'timeout' => $this->config->get('assinafy.timeout', 30),
            'logger' => $this->logger,
        ]);
    }

    public function createForProduction(): Client
    {
        return new Client([
            'api_key' => $this->config->get('assinafy.production.api_key'),
            'account_id' => $this->config->get('assinafy.production.account_id'),
            'webhook_secret' => $this->config->get('assinafy.production.webhook_secret'),
            'base_url' => $this->config->get('assinafy.production_url'),
            'timeout' => $this->config->get('assinafy.timeout', 30),
            'logger' => $this->logger,
        ]);
    }

    protected function getBaseUrl(): string
    {
        $env = $this->config->get('assinafy.env', 'sandbox');
        return $env === 'production'
            ? $this->config->get('assinafy.production_url')
            : $this->config->get('assinafy.sandbox_url');
    }
}
```

## Available Resources

The SDK provides fluent access to API resources:

### Documents Resource

```php
$documents = $client->documents();

// Upload a document
$result = $documents->upload('/path/to/file.pdf', 'Document Name.pdf');

// List documents
$list = $documents->list($accountId, [
    'page' => 1,
    'per-page' => 25,
    'status' => 'pending_signature',
]);

// Get document details
$document = $documents->get($documentId);

// Download artifact
$content = $documents->download($documentId, 'certificated');

// Get available statuses
$statuses = $documents->statuses();
```

### Signers Resource

```php
$signers = $client->signers();

// Create a signer
$signer = $signers->create($accountId, [
    'full_name' => 'John Doe',
    'email' => 'john@example.com',
    'whatsapp_phone_number' => '5511999999999',
]);

// List signers
$list = $signers->list($accountId);

// Get specific signer
$signer = $signers->get($accountId, $signerId);

// Update signer
$updated = $signers->update($accountId, $signerId, [
    'full_name' => 'John Updated',
    'email' => 'john.updated@example.com',
]);
```

### Assignments Resource

```php
$assignments = $client->assignments();

// Create virtual assignment
$virtual = $assignments->createVirtual($documentId, [
    'signers' => [
        ['id' => $signerId1],
        ['id' => $signerId2],
    ],
    'message' => 'Please sign this document.',
    'expires_at' => '2025-12-31T23:59:59Z',
]);

// Create collect assignment
$collect = $assignments->createCollect($documentId, [
    'signers' => [
        ['id' => $signerId1],
    ],
    'entries' => [
        [
            'page_id' => $pageId,
            'fields' => [
                [
                    'signer_id' => $signerId1,
                    'field_id' => $fieldId,
                    'display_settings' => [
                        'left' => 69,
                        'top' => 282,
                        'fontFamily' => 'Arial',
                        'fontSize' => 18,
                        'backgroundColor' => 'rgb(185, 218, 255)',
                    ],
                ],
            ],
        ],
    ],
    'expires_at' => '2025-12-31T23:59:59Z',
]);
```

### Webhooks Resource

```php
$webhooks = $client->webhooks();

// List subscriptions
$subscriptions = $webhooks->subscriptions($accountId);

// Update subscriptions
$webhooks->updateSubscriptions($accountId, [
    'events' => ['document_certificated', 'signer_signed_document'],
    'url' => config('assinafy.webhook.url'),
]);

// Get event types
$eventTypes = $webhooks->eventTypes();

// List webhook dispatches
$dispatches = $webhooks->list($accountId);

// Retry a dispatch
$webhooks->retry($accountId, $dispatchId);
```

## Exception Handling

The SDK throws specific exceptions for different error scenarios:

```php
use Assinafy\Exceptions\AuthenticationException;
use Assinafy\Exceptions\NotFoundException;
use Assinafy\Exceptions\RateLimitException;
use Assinafy\Exceptions\ValidationException;
use Assinafy\Exceptions\AssinafyException;

try {
    $document = $client->documents()->get($documentId);
} catch (AuthenticationException $e) {
    // Invalid API credentials
    Log::error('Assinafy authentication failed', [
        'message' => $e->getMessage(),
    ]);
} catch (NotFoundException $e) {
    // Resource not found
    Log::warning('Document not found', [
        'document_id' => $documentId,
    ]);
} catch (RateLimitException $e) {
    // Too many requests - implement backoff retry
    Log::warning('Rate limit exceeded', [
        'retry_after' => $e->getRetryAfter(),
    ]);
    throw $e;
} catch (ValidationException $e) {
    // Invalid request payload
    Log::error('Validation failed', [
        'errors' => $e->getErrors(),
    ]);
} catch (AssinafyException $e) {
    // General Assinafy API error
    Log::error('Assinafy API error', [
        'message' => $e->getMessage(),
        'code' => $e->getCode(),
    ]);
}
```

## Logging Integration

The SDK supports PSR-3 logging. Configure it to use Laravel's logger:

```php
use Illuminate\Support\Facades\Log;

// In your service provider or factory
$client = new Client([
    'api_key' => config('assinafy.api_key'),
    'account_id' => config('assinafy.account_id'),
    'logger' => Log::channel('assinafy'),
]);
```

Create a dedicated log channel in `config/logging.php`:

```php
// config/logging.php
'channels' => [
    // ...
    'assinafy' => [
        'driver' => 'daily',
        'path' => storage_path('logs/assinafy.log'),
        'level' => env('ASSINAFY_LOG_LEVEL', 'info'),
        'days' => 14,
    ],
],
```

## Testing with SDK

### Mocking the Client

```php
// tests/Unit/Services/AssinafyServiceTest.php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\AssinafyService;
use Assinafy\Client;
use Mockery;

class AssinafyServiceTest extends TestCase
{
    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_upload_document(): void
    {
        $mockClient = Mockery::mock(Client::class);
        $mockClient->documents()
            ->shouldReceive('upload')
            ->once()
            ->with('/path/to/file.pdf', 'Document.pdf')
            ->andReturn(['id' => 'doc_123', 'status' => 'uploading']);

        $service = new AssinafyService($mockClient, app('log'));
        $result = $service->uploadDocument('/path/to/file.pdf', 'Document.pdf');

        $this->assertEquals('doc_123', $result['id']);
    }
}
```

### Using Faker for Test Data

```php
// tests/Factories/AssinafyDocumentFactory.php

namespace Tests\Factories;

class AssinafyDocumentFactory
{
    public static function create(array $overrides = []): array
    {
        return array_merge([
            'id' => 'doc_' . uniqid(),
            'title' => 'Test Document',
            'status' => 'metadata_ready',
            'created_at' => now()->toIso8601String(),
        ], $overrides);
    }
}
```

## Performance Considerations

### Connection Pooling

```php
// Reuse client instances - don't create new ones for each request
$this->app->singleton(Client::class, function () {
    return (new ClientFactory(
        $this->app->make('config'),
        $this->app->make('log')
    ))->create();
});
```

### Request Timeout Tuning

```php
// For large file uploads
$client = new Client([
    'api_key' => config('assinafy.api_key'),
    'timeout' => 120, // 2 minutes for large files
    'connect_timeout' => 10,
]);
```

### Retry Strategy

```php
$client = new Client([
    'api_key' => config('assinafy.api_key'),
    'retry' => [
        'enabled' => true,
        'max_attempts' => 3,
        'backoff_multiplier' => 2, // 1s, 2s, 4s
        'retry_on_status' => [429, 500, 502, 503, 504],
    ],
]);
```

## Next Steps

- [Service Layer](03-service-layer.md) - Building services on top of the SDK
- [Signers Management](04-signers-management.md) - Managing signers

