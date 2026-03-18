# Testing Strategy

This section covers testing approaches for the Assinafy integration, including unit tests, integration tests, and mocking strategies.

## Overview

The testing strategy follows three levels:
1. **Unit Tests** - Test individual services and repositories
2. **Integration Tests** - Test API interactions with sandbox
3. **Feature Tests** - Test complete workflows

## Test Configuration

### phpunit.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="vendor/phpunit/phpunit/phpunit.xsd"
         bootstrap="vendor/autoload.php"
         colors="true"
         failOnRisky="true"
         failOnWarning="true">
    <testsuites>
        <testsuite name="Unit">
            <directory>tests/Unit</directory>
        </testsuite>
        <testsuite name="Feature">
            <directory>tests/Feature</directory>
        </testsuite>
    </testsuites>
    <coverage>
        <include>
            <directory suffix=".php">app</directory>
        </include>
    </coverage>
    <php>
        <env name="APP_ENV" value="testing"/>
        <env name="BCRYPT_ROUNDS" value="4"/>
        <env name="CACHE_DRIVER" value="array"/>
        <env name="DB_CONNECTION" value="sqlite"/>
        <env name="DB_DATABASE" value=":memory:"/>
        <env name="MAIL_MAILER" value="array"/>
        <env name="QUEUE_CONNECTION" value="sync"/>
        <env name="SESSION_DRIVER" value="array"/>
        <env name="TELESCOPE_ENABLED" value="false"/>
        
        <!-- Assinafy Test Configuration -->
        <env name="ASSINAFY_ENV" value="sandbox"/>
        <env name="ASSINAFY_API_KEY" value="test_api_key"/>
        <env name="ASSINAFY_ACCOUNT_ID" value="test_account_id"/>
        <env name="ASSINAFY_WEBHOOK_SECRET" value="test_secret"/>
    </php>
</phpunit>
```

## Unit Tests

### Repository Tests

```php
// tests/Unit/Repositories/AssinafySignerRepositoryTest.php

<?php

namespace Tests\Unit\Repositories;

use Tests\TestCase;
use App\Models\AssinafySigner;
use App\Repositories\AssinafySignerRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

class AssinafySignerRepositoryTest extends TestCase
{
    use RefreshDatabase;

    private AssinafySignerRepository $repository;

    protected function setUp(): void
    {
        parent::setUp();
        $this->repository = new AssinafySignerRepository();
    }

    public function test_create_signer(): void
    {
        $data = [
            'assinafy_signer_id' => 'sgn_123',
            'full_name' => 'John Doe',
            'email' => 'john@example.com',
            'whatsapp_phone_number' => '5511999999999',
        ];

        $signer = $this->repository->create($data);

        $this->assertInstanceOf(AssinafySigner::class, $signer);
        $this->assertEquals('John Doe', $signer->full_name);
        $this->assertEquals('john@example.com', $signer->email);
        $this->assertDatabaseHas('assinafy_signers', [
            'assinafy_signer_id' => 'sgn_123',
            'email' => 'john@example.com',
        ]);
    }

    public function test_find_by_email(): void
    {
        AssinafySigner::factory()->create([
            'email' => 'test@example.com',
            'assinafy_signer_id' => 'sgn_001',
        ]);

        $signer = $this->repository->findByEmail('test@example.com');

        $this->assertNotNull($signer);
        $this->assertEquals('test@example.com', $signer->email);
    }

    public function test_find_by_email_returns_null_when_not_found(): void
    {
        $signer = $this->repository->findByEmail('nonexistent@example.com');
        $this->assertNull($signer);
    }

    public function test_find_by_assinafy_id(): void
    {
        AssinafySigner::factory()->create([
            'assinafy_signer_id' => 'sgn_external_123',
            'email' => 'test@example.com',
        ]);

        $signer = $this->repository->findByAssinafyId('sgn_external_123');

        $this->assertNotNull($signer);
        $this->assertEquals('sgn_external_123', $signer->assinafy_signer_id);
    }
}
```

### Service Tests with Mocks

```php
// tests/Unit/Services/AssinafyServiceTest.php

<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\AssinafyService;
use App\Repositories\AssinafySignerRepository;
use App\Repositories\AssinafyDocumentRepository;
use Assinafy\Client;
use Illuminate\Support\Facades\Log;
use Mockery;
use Mockery\MockInterface;

class AssinafyServiceTest extends TestCase
{
    private MockInterface $clientMock;
    private AssinafyService $service;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->clientMock = Mockery::mock(Client::class);
        $signerRepo = new AssinafySignerRepository();
        $documentRepo = new AssinafyDocumentRepository();
        
        $this->service = new AssinafyService(
            $this->clientMock,
            $signerRepo,
            $documentRepo,
            Log::channel('testing')
        );
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_create_or_get_signer_creates_new_signer(): void
    {
        $data = [
            'full_name' => 'Jane Doe',
            'email' => 'jane@example.com',
            'whatsapp_phone_number' => '5511988888888',
        ];

        $this->clientMock->shouldReceive('signers')
            ->once()
            ->andReturnSelf();

        $this->clientMock->shouldReceive('create')
            ->once()
            ->with(config('assinafy.account_id'), Mockery::on(function ($payload) use ($data) {
                return $payload['full_name'] === $data['full_name']
                    && $payload['email'] === $data['email'];
            }))
            ->andReturn(['id' => 'sgn_new_123']);

        $signerId = $this->service->createOrGetSigner($data);

        $this->assertEquals('sgn_new_123', $signerId);
        $this->assertDatabaseHas('assinafy_signers', [
            'assinafy_signer_id' => 'sgn_new_123',
            'email' => 'jane@example.com',
        ]);
    }

    public function test_create_or_get_signer_returns_existing(): void
    {
        // Create existing signer
        $existingSigner = \App\Models\AssinafySigner::factory()->create([
            'email' => 'existing@example.com',
            'assinafy_signer_id' => 'sgn_existing_456',
        ]);

        $data = [
            'full_name' => 'Updated Name',
            'email' => 'existing@example.com',
        ];

        // Should not call the API
        $this->clientMock->shouldReceive('signers')->never();

        $signerId = $this->service->createOrGetSigner($data);

        $this->assertEquals('sgn_existing_456', $signerId);
    }

    public function test_upload_document_returns_existing_for_duplicate_hash(): void
    {
        // Create temp file
        $tempFile = tempnam(sys_get_temp_dir(), 'test');
        file_put_contents($tempFile, 'test content');
        $hash = hash('sha256', 'test content');

        // Create existing document with same hash
        \App\Models\AssinafyDocument::factory()->create([
            'assinafy_document_id' => 'doc_existing_789',
            'hash_sha256_original' => $hash,
        ]);

        // Should not call the API
        $this->clientMock->shouldReceive('documents')->never();

        $result = $this->service->uploadDocument($tempFile, 'test.pdf');

        $this->assertEquals('doc_existing_789', $result['document_id']);
        $this->assertTrue($result['existing']);

        unlink($tempFile);
    }

    /**
     * @dataProvider signerValidationDataProvider
     */
    public function test_validate_signer_data(array $data, string $expectedException): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage($expectedException);

        $this->service->createOrGetSigner($data);
    }

    public static function signerValidationDataProvider(): array
    {
        return [
            'missing full_name' => [
                ['email' => 'test@example.com'],
                'full_name is required',
            ],
            'invalid email' => [
                ['full_name' => 'Test', 'email' => 'invalid-email'],
                'Valid email is required',
            ],
            'empty email' => [
                ['full_name' => 'Test', 'email' => ''],
                'Valid email is required',
            ],
        ];
    }

    public function test_request_virtual_signature(): void
    {
        $documentId = 'doc_test_123';
        $signerIds = ['sgn_1', 'sgn_2'];
        $message = 'Please sign this document';

        $this->clientMock->shouldReceive('assignments')
            ->once()
            ->andReturnSelf();

        $this->clientMock->shouldReceive('create')
            ->once()
            ->with(
                $documentId,
                Mockery::on(function ($payload) use ($signerIds, $message) {
                    return $payload['method'] === 'virtual'
                        && $payload['message'] === $message
                        && count($payload['signers']) === 2;
                })
            )
            ->andReturn(['id' => 'assignment_123']);

        $result = $this->service->requestVirtualSignature(
            $documentId,
            $signerIds,
            $message
        );

        $this->assertEquals('assignment_123', $result['id']);
    }
}
```

## Integration Tests

### API Integration Tests

```php
// tests/Integration/AssinafyApiTest.php

<?php

namespace Tests\Integration;

use Tests\TestCase;
use Assinafy\Client;
use Illuminate\Support\Facades\Config;

class AssinafyApiTest extends TestCase
{
    private Client $client;

    protected function setUp(): void
    {
        parent::setUp();

        // Skip if no sandbox credentials
        if (empty(config('assinafy.api_key')) || config('assinafy.api_key') === 'test_api_key') {
            $this->markTestSkipped('No sandbox credentials configured');
        }

        $this->client = new Client([
            'api_key' => config('assinafy.api_key'),
            'account_id' => config('assinafy.account_id'),
            'base_url' => config('assinafy.sandbox_url'),
        ]);
    }

    public function test_get_document_statuses(): void
    {
        $response = $this->client->documents()->statuses();

        $this->assertIsArray($response);
        $this->assertNotEmpty($response);
    }

    public function test_list_documents(): void
    {
        $response = $this->client->documents()->list(
            config('assinafy.account_id'),
            ['per-page' => 5]
        );

        $this->assertIsArray($response);
        $this->assertArrayHasKey('data', $response);
    }

    public function test_create_and_retrieve_signer(): void
    {
        $uniqueEmail = 'test_' . time() . '@example.com';

        $createResponse = $this->client->signers()->create(
            config('assinafy.account_id'),
            [
                'full_name' => 'Test Signer ' . time(),
                'email' => $uniqueEmail,
                'whatsapp_phone_number' => '5511999999999',
            ]
        );

        $this->assertArrayHasKey('id', $createResponse);

        $getResponse = $this->client->signers()->get(
            config('assinafy.account_id'),
            $createResponse['id']
        );

        $this->assertEquals($uniqueEmail, $getResponse['email']);
    }
}
```

## Feature Tests

### Webhook Feature Test

```php
// tests/Feature/AssinafyWebhookTest.php

<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\AssinafyWebhookDispatch;
use App\Services\AssinafyWebhookService;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Config;

class AssinafyWebhookTest extends TestCase
{
    public function test_webhook_endpoint_accepts_valid_signature(): void
    {
        Config::set('assinafy.webhook_secret', 'test_secret');

        $payload = [
            'event' => 'document_certificated',
            'data' => [
                'document_id' => 'doc_test_123',
                'status' => 'certificated',
            ],
            'dispatch_id' => 'dispatch_abc123',
        ];

        // Generate signature (implementation depends on Assinafy's actual signature method)
        $signature = hash_hmac('sha256', json_encode($payload), 'test_secret');

        $response = $this->postJson(route('assinafy.webhook'), $payload, [
            'X-Webhook-Signature' => $signature,
        ]);

        $response->assertStatus(200);
        
        $this->assertDatabaseHas('assinafy_webhook_dispatches', [
            'external_dispatch_id' => 'dispatch_abc123',
            'event' => 'document_certificated',
        ]);
    }

    public function test_webhook_endpoint_rejects_invalid_signature(): void
    {
        Config::set('assinafy.webhook_secret', 'test_secret');

        $payload = ['event' => 'document_certificated'];

        $response = $this->postJson(route('assinafy.webhook'), $payload, [
            'X-Webhook-Signature' => 'invalid_signature',
        ]);

        $response->assertStatus(401);
    }

    public function test_webhook_processing_is_idempotent(): void
    {
        // Create already processed dispatch
        AssinafyWebhookDispatch::factory()->create([
            'external_dispatch_id' => 'dispatch_duplicate_123',
            'delivered' => true,
            'processed_at' => now(),
        ]);

        $payload = [
            'event' => 'document_certificated',
            'dispatch_id' => 'dispatch_duplicate_123',
        ];

        $service = app(AssinafyWebhookService::class);
        $result = $service->process($payload);

        $this->assertFalse($result['processed']); // Should not process again
    }
}
```

### Complete Workflow Test

```php
// tests/Feature/DocumentSignatureWorkflowTest.php

<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Services\AssinafyService;
use App\Models\AssinafyDocument;
use App\Models\AssinafySigner;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\UploadedFile;

class DocumentSignatureWorkflowTest extends TestCase
{
    public function test_complete_signature_workflow(): void
    {
        Storage::fake('local');

        // 1. Create a test PDF file
        $pdf = UploadedFile::fake()->create('document.pdf', 1000);

        // Mock the Assinafy client
        $this->partialMock(AssinafyService::class, function ($mock) {
            $mock->shouldReceive('uploadDocument')
                ->once()
                ->andReturn([
                    'document_id' => 'doc_workflow_123',
                    'status' => 'metadata_ready',
                    'existing' => false,
                ]);

            $mock->shouldReceive('waitForDocumentReady')
                ->once()
                ->with('doc_workflow_123')
                ->andReturn([
                    'id' => 'doc_workflow_123',
                    'status' => 'metadata_ready',
                ]);

            $mock->shouldReceive('createOrGetSigner')
                ->twice()
                ->andReturn('sgn_workflow_1', 'sgn_workflow_2');

            $mock->shouldReceive('requestVirtualSignature')
                ->once()
                ->with('doc_workflow_123', ['sgn_workflow_1', 'sgn_workflow_2'], null)
                ->andReturn(['id' => 'assignment_workflow_1']);
        });

        // 2. Make the request
        $response = $this->postJson(route('documents.sign'), [
            'file' => $pdf,
            'signers' => [
                [
                    'full_name' => 'Signer One',
                    'email' => 'signer1@example.com',
                ],
                [
                    'full_name' => 'Signer Two',
                    'email' => 'signer2@example.com',
                ],
            ],
            'method' => 'virtual',
        ]);

        // 3. Assertions
        $response->assertStatus(200)
            ->assertJsonStructure([
                'document_id',
                'status',
                'assignment_id',
            ]);

        $this->assertDatabaseHas('assinafy_documents', [
            'assinafy_document_id' => 'doc_workflow_123',
            'status' => 'metadata_ready',
        ]);
    }
}
```

## Mocking SDK Responses

### Mock Factory

```php
// tests/Mocks/AssinafyClientMock.php

<?php

namespace Tests\Mocks;

use Assinafy\Client;

class AssinafyClientMock
{
    public static function create(): Client
    {
        return new class extends Client {
            private array $responses = [];
            private array $history = [];

            public function __construct(array $config = [])
            {
                parent::__construct($config);
            }

            public function setResponse(string $method, string $key, mixed $response): void
            {
                $this->responses[$method][$key] = $response;
            }

            public function documents()
            {
                $mock = new class($this->responses, $this->history) {
                    private array $responses;
                    private array &$history;

                    public function __construct(array &$responses, array &$history)
                    {
                        $this->responses = &$responses;
                        $this->history = &$history;
                    }

                    public function upload(string $path, string $name): array
                    {
                        $this->history[] = ['method' => 'upload', 'args' => [$path, $name]];
                        return $this->responses['upload'][$path] 
                            ?? ['id' => 'doc_mock_' . uniqid(), 'status' => 'uploading'];
                    }

                    public function get(string $id): array
                    {
                        $this->history[] = ['method' => 'get', 'args' => [$id]];
                        return $this->responses['get'][$id]
                            ?? ['id' => $id, 'status' => 'metadata_ready'];
                    }

                    public function download(string $documentId, string $artifact): string
                    {
                        $this->history[] = ['method' => 'download', 'args' => [$documentId, $artifact]];
                        return $this->responses['download'][$documentId]
                            ?? '%PDF-mock-content';
                    }
                };

                return $mock;
            }

            public function signers()
            {
                $mock = new class($this->responses, $this->history) {
                    private array $responses;
                    private array &$history;

                    public function __construct(array &$responses, array &$history)
                    {
                        $this->responses = &$responses;
                        $this->history = &$history;
                    }

                    public function create(string $accountId, array $data): array
                    {
                        $this->history[] = ['method' => 'create', 'args' => func_get_args()];
                        return $this->responses['create'][$data['email']]
                            ?? ['id' => 'sgn_mock_' . uniqid(), ...$data];
                    }

                    public function get(string $accountId, string $signerId): array
                    {
                        return ['id' => $signerId, 'email' => 'mock@example.com'];
                    }
                };

                return $mock;
            }

            public function assignments()
            {
                $mock = new class($this->responses, $this->history) {
                    private array $responses;
                    private array &$history;

                    public function __construct(array &$responses, array &$history)
                    {
                        $this->responses = &$responses;
                        $this->history = &$history;
                    }

                    public function create(string $documentId, array $data): array
                    {
                        $this->history[] = ['method' => 'createAssignment', 'args' => func_get_args()];
                        return $this->responses['createAssignment'][$documentId]
                            ?? ['id' => 'assignment_mock_' . uniqid()];
                    }
                };

                return $mock;
            }
        };
    }

    public static function getHistory(): array
    {
        return static::$history ?? [];
    }
}
```

## Test Factories

```php
// database/factories/AssinafySignerFactory.php

<?php

namespace Database\Factories;

use App\Models\AssinafySigner;
use Illuminate\Database\Eloquent\Factories\Factory;

class AssinafySignerFactory extends Factory
{
    protected $model = AssinafySigner::class;

    public function definition(): array
    {
        return [
            'assinafy_signer_id' => 'sgn_' . fake()->uuid(),
            'full_name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'whatsapp_phone_number' => '55' . fake()->numberBetween(11, 99) . fake()->phoneNumber(),
            'document_number' => fake()->cpf(false),
            'is_active' => true,
        ];
    }

    public function inactive(): self
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
```

```php
// database/factories/AssinafyDocumentFactory.php

<?php

namespace Database\Factories;

use App\Models\AssinafyDocument;
use Illuminate\Database\Eloquent\Factories\Factory;

class AssinafyDocumentFactory extends Factory
{
    protected $model = AssinafyDocument::class;

    public function definition(): array
    {
        return [
            'assinafy_document_id' => 'doc_' . fake()->uuid(),
            'processo_id' => null,
            'title' => fake()->sentence(3),
            'file_name' => fake()->word() . '.pdf',
            'status' => 'metadata_ready',
            'signature_method' => fake()->randomElement(['virtual', 'collect']),
            'hash_sha256_original' => hash('sha256', fake()->text()),
            'hash_sha256_certificated' => null,
            'expires_at' => fake()->dateTimeBetween('+1 week', '+1 month'),
            'certificated_at' => null,
        ];
    }

    public function certificated(): self
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'certificated',
            'certificated_at' => fake()->dateTimeBetween('-1 week', 'now'),
            'hash_sha256_certificated' => hash('sha256', fake()->text()),
        ]);
    }

    public function pending(): self
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'pending_signature',
        ]);
    }
}
```

## Running Tests

```bash
# Run all tests
./vendor/bin/phpunit

# Run unit tests only
./vendor/bin/phpunit --testsuite=Unit

# Run specific test
./vendor/bin/phpunit tests/Unit/Services/AssinafyServiceTest.php

# Run with coverage
./vendor/bin/phpunit --coverage-html coverage

# Run integration tests (requires sandbox credentials)
ASSINAFY_API_KEY=your_key ./vendor/bin/phpunit tests/Integration/
```

## Next Steps

- [Security Checklist](11-security-checklist.md)
- [Deployment Checklist](12-deployment-checklist.md)
