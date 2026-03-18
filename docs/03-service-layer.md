# Service Layer Architecture

This section covers the recommended service layer architecture for integrating Assinafy into your Laravel application.

## Architecture Overview

```
Controller → AssinafyService → AssinafyClient (SDK)
                ↓
         AssinafyRepository → Database
                ↓
         AssinafyWebhookService → Event Processing
```

## Core Service Class

Create `app/Services/AssinafyService.php`:

```php
<?php

namespace App\Services;

use Assinafy\Client;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Repositories\AssinafySignerRepository;
use App\Repositories\AssinafyDocumentRepository;
use App\Exceptions\AssinafyServiceException;

final class AssinafyService
{
    private const SIGNER_CACHE_TTL = 3600; // 1 hour
    
    public function __construct(
        private Client $client,
        private AssinafySignerRepository $signerRepo,
        private AssinafyDocumentRepository $documentRepo,
        private Log $logger
    ) {}

    /**
     * Create or retrieve existing signer
     */
    public function createOrGetSigner(array $data): string
    {
        // 1. Check if signer already exists by email
        $existing = $this->signerRepo->findByEmail($data['email']);
        
        if ($existing && $existing->assinafy_signer_id) {
            $this->logger->info('Signer already exists', [
                'email' => $data['email'],
                'signer_id' => $existing->assinafy_signer_id
            ]);
            return $existing->assinafy_signer_id;
        }

        // 2. Validate input data
        $this->validateSignerData($data);

        // 3. Create signer in Assinafy
        try {
            $response = $this->client->signers()->create(
                config('assinafy.account_id'),
                [
                    'full_name' => $data['full_name'],
                    'email' => $data['email'],
                    'whatsapp_phone_number' => $data['whatsapp_phone_number'] ?? null,
                ]
            );

            $assinafySignerId = $response['id'];

            // 4. Persist locally
            $this->signerRepo->create([
                'assinafy_signer_id' => $assinafySignerId,
                'full_name' => $data['full_name'],
                'email' => $data['email'],
                'whatsapp_phone_number' => $data['whatsapp_phone_number'] ?? null,
                'document_number' => $data['document_number'] ?? null,
            ]);

            $this->logger->info('Signer created successfully', [
                'signer_id' => $assinafySignerId,
                'email' => $data['email']
            ]);

            return $assinafySignerId;

        } catch (\Exception $e) {
            $this->logger->error('Failed to create signer', [
                'email' => $data['email'],
                'error' => $e->getMessage()
            ]);
            throw new AssinafyServiceException(
                "Failed to create signer: {$e->getMessage()}",
                previous: $e
            );
        }
    }

    /**
     * Upload document to Assinafy
     */
    public function uploadDocument(
        string $filePath,
        string $fileName,
        ?string $processoId = null
    ): array {
        // 1. Calculate hash for deduplication
        $hash = hash_file('sha256', $filePath);

        // 2. Check for duplicates
        $existing = $this->documentRepo->findByHash($hash);
        if ($existing) {
            $this->logger->info('Document already exists', [
                'existing_document_id' => $existing->assinafy_document_id,
                'hash' => $hash
            ]);
            return [
                'document_id' => $existing->assinafy_document_id,
                'status' => $existing->status,
                'existing' => true
            ];
        }

        // 3. Upload to Assinafy
        try {
            $response = $this->client->documents()->upload($filePath, $fileName);
            
            $documentId = $response['id'];

            // 4. Persist locally
            $this->documentRepo->create([
                'assinafy_document_id' => $documentId,
                'processo_id' => $processoId,
                'title' => pathinfo($fileName, PATHINFO_FILENAME),
                'file_name' => $fileName,
                'status' => $response['status'] ?? 'uploading',
                'hash_sha256_original' => $hash,
            ]);

            $this->logger->info('Document uploaded successfully', [
                'document_id' => $documentId,
                'file_name' => $fileName
            ]);

            return [
                'document_id' => $documentId,
                'status' => $response['status'],
                'existing' => false
            ];

        } catch (\Exception $e) {
            $this->logger->error('Failed to upload document', [
                'file_name' => $fileName,
                'error' => $e->getMessage()
            ]);
            throw new AssinafyServiceException(
                "Failed to upload document: {$e->getMessage()}",
                previous: $e
            );
        }
    }

    /**
     * Wait for document to be ready for signature
     */
    public function waitForDocumentReady(
        string $documentId,
        int $maxAttempts = 30,
        int $waitSeconds = 2
    ): array {
        $attempts = 0;

        while ($attempts < $maxAttempts) {
            try {
                $document = $this->client->documents()->get($documentId);
                $status = $document['status'];

                // Update local status
                $this->documentRepo->updateStatus($documentId, $status);

                if (in_array($status, ['metadata_ready', 'pending_signature', 'certificated'])) {
                    $this->logger->info('Document ready for signature', [
                        'document_id' => $documentId,
                        'status' => $status
                    ]);
                    return $document;
                }

                if (in_array($status, ['failed', 'rejected_by_user', 'expired'])) {
                    throw new AssinafyServiceException(
                        "Document cannot be signed. Status: {$status}"
                    );
                }

                $attempts++;
                sleep($waitSeconds);

            } catch (\Exception $e) {
                $attempts++;
                
                if ($attempts >= $maxAttempts) {
                    throw $e;
                }
                sleep($waitSeconds);
            }
        }

        throw new AssinafyServiceException(
            "Document did not become ready after {$maxAttempts} attempts"
        );
    }

    /**
     * Request virtual signature (automated)
     */
    public function requestVirtualSignature(
        string $documentId,
        array $signerIds,
        ?string $message = null,
        ?\DateTimeInterface $expiresAt = null
    ): array {
        $payload = [
            'method' => 'virtual',
            'signers' => array_map(fn($id) => ['id' => $id], $signerIds),
        ];

        if ($message) {
            $payload['message'] = $message;
        }

        if ($expiresAt) {
            $payload['expires_at'] = $expiresAt->format(\DateTime::ATOM);
        }

        try {
            $response = $this->client->assignments()->create($documentId, $payload);

            $this->logger->info('Virtual signature requested', [
                'document_id' => $documentId,
                'signer_count' => count($signerIds)
            ]);

            return $response;

        } catch (\Exception $e) {
            $this->logger->error('Failed to request virtual signature', [
                'document_id' => $documentId,
                'error' => $e->getMessage()
            ]);
            throw new AssinafyServiceException(
                "Failed to request signature: {$e->getMessage()}",
                previous: $e
            );
        }
    }

    /**
     * Request collect signature (with fields)
     */
    public function requestCollectSignature(
        string $documentId,
        array $signers,
        array $entries,
        ?string $message = null,
        ?\DateTimeInterface $expiresAt = null
    ): array {
        $payload = [
            'method' => 'collect',
            'signers' => array_map(fn($id) => ['id' => $id], $signers),
            'entries' => $entries,
        ];

        if ($message) {
            $payload['message'] = $message;
        }

        if ($expiresAt) {
            $payload['expires_at'] = $expiresAt->format(\DateTime::ATOM);
        }

        try {
            $response = $this->client->assignments()->create($documentId, $payload);

            $this->logger->info('Collect signature requested', [
                'document_id' => $documentId,
                'signer_count' => count($signers)
            ]);

            return $response;

        } catch (\Exception $e) {
            $this->logger->error('Failed to request collect signature', [
                'document_id' => $documentId,
                'error' => $e->getMessage()
            ]);
            throw new AssinafyServiceException(
                "Failed to request signature: {$e->getMessage()}",
                previous: $e
            );
        }
    }

    /**
     * Get document status
     */
    public function getDocumentStatus(string $documentId): array
    {
        try {
            $document = $this->client->documents()->get($documentId);
            
            // Update local status
            $this->documentRepo->updateStatus($documentId, $document['status']);

            return $document;

        } catch (\Exception $e) {
            $this->logger->error('Failed to get document status', [
                'document_id' => $documentId,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Download document artifact
     */
    public function downloadArtifact(
        string $documentId,
        string $artifactType = 'certificated'
    ): string {
        try {
            $content = $this->client->documents()->download($documentId, $artifactType);

            $this->logger->info('Artifact downloaded', [
                'document_id' => $documentId,
                'artifact_type' => $artifactType
            ]);

            return $content;

        } catch (\Exception $e) {
            $this->logger->error('Failed to download artifact', [
                'document_id' => $documentId,
                'artifact_type' => $artifactType,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Validate signer data
     */
    private function validateSignerData(array $data): void
    {
        if (empty($data['full_name'])) {
            throw new \InvalidArgumentException('full_name is required');
        }

        if (empty($data['email']) || !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException('Valid email is required');
        }
    }
}
```

## Repository Pattern

Create `app/Repositories/AssinafyDocumentRepository.php`:

```php
<?php

namespace App\Repositories;

use App\Models\AssinafyDocument;
use Illuminate\Database\Eloquent\Model;

class AssinafyDocumentRepository
{
    public function create(array $data): AssinafyDocument
    {
        return AssinafyDocument::create($data);
    }

    public function findByAssinafyId(string $id): ?AssinafyDocument
    {
        return AssinafyDocument::where('assinafy_document_id', $id)->first();
    }

    public function findByHash(string $hash): ?AssinafyDocument
    {
        return AssinafyDocument::where('hash_sha256_original', $hash)->first();
    }

    public function updateStatus(string $assinafyDocumentId, string $status): bool
    {
        return AssinafyDocument::where('assinafy_document_id', $assinafyDocumentId)
            ->update(['status' => $status]);
    }

    public function markAsCertificated(string $assinafyDocumentId, string $hash): bool
    {
        return AssinafyDocument::where('assinafy_document_id', $assinafyDocumentId)
            ->update([
                'status' => 'certificated',
                'certificated_at' => now(),
                'hash_sha256_certificated' => $hash,
            ]);
    }
}
```

Create `app/Repositories/AssinafySignerRepository.php`:

```php
<?php

namespace App\Repositories;

use App\Models\AssinafySigner;

class AssinafySignerRepository
{
    public function create(array $data): AssinafySigner
    {
        return AssinafySigner::create($data);
    }

    public function findByEmail(string $email): ?AssinafySigner
    {
        return AssinafySigner::where('email', $email)->first();
    }

    public function findByAssinafyId(string $id): ?AssinafySigner
    {
        return AssinafySigner::where('assinafy_signer_id', $id)->first();
    }
}
```

## Dependency Injection Setup

In `app/Providers/AppServiceProvider.php`:

```php
<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Repositories\AssinafyDocumentRepository;
use App\Repositories\AssinafySignerRepository;
use App\Services\AssinafyService;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Register repositories
        $this->app->singleton(AssinafyDocumentRepository::class);
        $this->app->singleton(AssinafySignerRepository::class);
    }
}
```

## Usage in Controller

```php
<?php

namespace App\Http\Controllers;

use App\Services\AssinafyService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class DocumentSignatureController extends Controller
{
    public function __construct(
        private AssinafyService $assinafy
    ) {}

    public function uploadAndRequest(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => 'required|file|mimes:pdf|max:10240',
            'signers' => 'required|array|min:1',
            'signers.*.full_name' => 'required|string',
            'signers.*.email' => 'required|email',
            'signers.*.whatsapp_phone_number' => 'nullable|string',
            'message' => 'nullable|string',
            'method' => 'required|in:virtual,collect',
        ]);

        try {
            // 1. Upload document
            $uploaded = $this->assinafy->uploadDocument(
                $request->file('file')->getPathname(),
                $request->file('file')->getClientOriginalName()
            );

            // 2. Wait for document to be ready
            $document = $this->assinafy->waitForDocumentReady(
                $uploaded['document_id']
            );

            // 3. Create signers
            $signerIds = [];
            foreach ($validated['signers'] as $signerData) {
                $signerIds[] = $this->assinafy->createOrGetSigner($signerData);
            }

            // 4. Request signature
            if ($validated['method'] === 'virtual') {
                $assignment = $this->assinafy->requestVirtualSignature(
                    $uploaded['document_id'],
                    $signerIds,
                    $validated['message'] ?? null
                );
            } else {
                $assignment = $this->assinafy->requestCollectSignature(
                    $uploaded['document_id'],
                    $signerIds,
                    $request->input('entries', []),
                    $validated['message'] ?? null
                );
            }

            return response()->json([
                'document_id' => $uploaded['document_id'],
                'status' => $document['status'],
                'assignment_id' => $assignment['id'] ?? null,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
```

## Next Steps

- [Signers Management](04-signers-management.md)
- [Document Upload](05-document-upload.md)
