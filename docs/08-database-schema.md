# Database Schema

This section provides the complete database schema for tracking Assinafy documents, signers, and webhook events.

## Overview

The schema consists of 5 tables:
1. `assinafy_signers` - Store signer information
2. `assinafy_documents` - Track document status
3. `assinafy_document_signers` - Link documents to signers
4. `assinafy_document_status_history` - Audit trail for status changes
5. `assinafy_webhook_dispatches` - Track webhook events

## Migration 1: Signers Table

```php
// database/migrations/2024_01_01_000001_create_assinafy_signers_table.php

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assinafy_signers', function (Blueprint $table) {
            $table->id();
            
            // Assinafy external reference
            $table->string('assinafy_signer_id', 64)->unique()->comment('External ID from Assinafy');
            
            // Signer information
            $table->string('full_name');
            $table->string('email');
            $table->string('whatsapp_phone_number', 20)->nullable();
            $table->string('document_number', 30)->nullable()->comment('CPF/CNPJ');
            
            // Metadata
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_used_at')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes
            $table->index('email');
            $table->index('document_number');
            $table->index('assinafy_signer_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assinafy_signers');
    }
};
```

## Migration 2: Documents Table

```php
// database/migrations/2024_01_01_000002_create_assinafy_documents_table.php

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assinafy_documents', function (Blueprint $table) {
            $table->id();
            
            // Assinafy external reference
            $table->string('assinafy_document_id', 64)->unique()->comment('External ID from Assinafy');
            
            // Internal reference
            $table->unsignedBigInteger('processo_id')->nullable()->comment('Reference to internal process/document');
            
            // Document information
            $table->string('title');
            $table->string('file_name');
            $table->string('status', 50)->default('uploading');
            $table->string('signature_method', 20)->nullable()->comment('virtual or collect');
            
            // Hashes for integrity
            $table->string('hash_sha256_original', 64)->nullable();
            $table->string('hash_sha256_certificated', 64)->nullable();
            
            // Timestamps
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('certificated_at')->nullable();
            
            // Storage paths
            $table->string('original_path', 500)->nullable();
            $table->string('certificated_path', 500)->nullable();
            
            $table->timestamps();
            $table->softDeletes();
            
            // Foreign key (optional - adjust based on your system)
            // $table->foreign('processo_id')->references('id')->on('processos')->nullOnDelete();
            
            // Indexes
            $table->index('assinafy_document_id');
            $table->index('status');
            $table->index('processo_id');
            $table->index('hash_sha256_original');
            $table->index('certificated_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assinafy_documents');
    }
};
```

## Migration 3: Document Signers Pivot Table

```php
// database/migrations/2024_01_01_000003_create_assinafy_document_signer_table.php

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assinafy_document_signers', function (Blueprint $table) {
            $table->id();
            
            // References
            $table->foreignId('document_id')->constrained('assinafy_documents')->cascadeOnDelete();
            $table->foreignId('signer_id')->constrained('assinafy_signers')->cascadeOnDelete();
            
            // Assinafy assignment reference
            $table->string('assinafy_assignment_item_id', 64)->nullable();
            
            // Signing order
            $table->unsignedInteger('sign_order')->default(0);
            
            // Status tracking
            $table->string('status', 50)->default('pending')->comment('pending, signed, rejected');
            $table->timestamp('signed_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->text('decline_reason')->nullable();
            
            // Metadata
            $table->json('metadata')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->unique(['document_id', 'signer_id'], 'unique_doc_signer');
            $table->index('status');
            $table->index('assinafy_assignment_item_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assinafy_document_signers');
    }
};
```

## Migration 4: Status History Table

```php
// database/migrations/2024_01_01_000004_create_assinafy_document_status_history_table.php

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assinafy_document_status_history', function (Blueprint $table) {
            $table->id();
            
            // Reference
            $table->foreignId('document_id')->constrained('assinafy_documents')->cascadeOnDelete();
            
            // Status change tracking
            $table->string('previous_status', 50)->nullable();
            $table->string('new_status', 50);
            
            // Source of change
            $table->string('source', 20)->default('webhook')->comment('webhook, polling, manual');
            
            // Additional data
            $table->json('payload_snapshot')->nullable()->comment('Raw webhook/polling data');
            $table->text('notes')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index('document_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assinafy_document_status_history');
    }
};
```

## Migration 5: Webhook Dispatches Table

```php
// database/migrations/2024_01_01_000005_create_assinafy_webhook_dispatches_table.php

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assinafy_webhook_dispatches', function (Blueprint $table) {
            $table->id();
            
            // Assinafy reference
            $table->string('account_id', 64)->nullable();
            $table->string('external_dispatch_id', 64)->unique()->comment('ID from Assinafy');
            
            // Event information
            $table->string('event', 100)->comment('Event type like document_certificated');
            $table->string('endpoint', 500)->nullable();
            
            // Delivery tracking
            $table->boolean('delivered')->default(false);
            $table->unsignedSmallInteger('http_status')->nullable();
            $table->text('response_body')->nullable();
            
            // Payload
            $table->longText('payload')->comment('Raw webhook payload');
            
            // Processing
            $table->timestamp('received_at')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->text('error')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index('event');
            $table->index('delivered');
            $table->index('received_at');
            $table->index('external_dispatch_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assinafy_webhook_dispatches');
    }
};
```

## Eloquent Models

### AssinafySigner Model

```php
// app/Models/AssinafySigner.php

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class AssinafySigner extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'assinafy_signer_id',
        'full_name',
        'email',
        'whatsapp_phone_number',
        'document_number',
        'is_active',
        'last_used_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'last_used_at' => 'datetime',
    ];

    /**
     * Documents associated with this signer
     */
    public function documents(): BelongsToMany
    {
        return $this->belongsToMany(
            AssinafyDocument::class,
            'assinafy_document_signers',
            'signer_id',
            'document_id'
        )->withPivot([
            'assinafy_assignment_item_id',
            'sign_order',
            'status',
            'signed_at',
            'rejected_at',
            'decline_reason',
            'metadata'
        ])->withTimestamps();
    }

    /**
     * Scope for active signers
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Find by email
     */
    public static function findByEmail(string $email): ?self
    {
        return static::where('email', $email)->first();
    }

    /**
     * Find by Assinafy ID
     */
    public static function findByAssinafyId(string $id): ?self
    {
        return static::where('assinafy_signer_id', $id)->first();
    }

    /**
     * Mark as recently used
     */
    public function markAsUsed(): void
    {
        $this->update(['last_used_at' => now()]);
    }
}
```

### AssinafyDocument Model

```php
// app/Models/AssinafyDocument.php

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class AssinafyDocument extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'assinafy_document_id',
        'processo_id',
        'title',
        'file_name',
        'status',
        'signature_method',
        'hash_sha256_original',
        'hash_sha256_certificated',
        'expires_at',
        'certificated_at',
        'original_path',
        'certificated_path',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'certificated_at' => 'datetime',
    ];

    /**
     * Signers for this document
     */
    public function signers(): BelongsToMany
    {
        return $this->belongsToMany(
            AssinafySigner::class,
            'assinafy_document_signers',
            'document_id',
            'signer_id'
        )->withPivot([
            'assinafy_assignment_item_id',
            'sign_order',
            'status',
            'signed_at',
            'rejected_at',
            'decline_reason',
            'metadata'
        ])->orderBy('assinafy_document_signers.sign_order')
        ->withTimestamps();
    }

    /**
     * Status history
     */
    public function statusHistory(): HasMany
    {
        return $this->hasMany(AssinafyDocumentStatusHistory::class, 'document_id')
            ->orderBy('created_at', 'desc');
    }

    /**
     * Scope for documents by status
     */
    public function scopeWithStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope for pending signature documents
     */
    public function scopePendingSignature($query)
    {
        return $query->whereIn('status', ['pending_signature', 'metadata_ready']);
    }

    /**
     * Scope for certificated documents
     */
    public function scopeCertificated($query)
    {
        return $query->where('status', 'certificated');
    }

    /**
     * Check if document is certificated
     */
    public function isCertificated(): bool
    {
        return $this->status === 'certificated' && $this->certificated_at !== null;
    }

    /**
     * Check if document is pending
     */
    public function isPending(): bool
    {
        return in_array($this->status, ['pending_signature', 'metadata_ready']);
    }

    /**
     * Find by Assinafy ID
     */
    public static function findByAssinafyId(string $id): ?self
    {
        return static::where('assinafy_document_id', $id)->first();
    }

    /**
     * Find by hash
     */
    public static function findByHash(string $hash): ?self
    {
        return static::where('hash_sha256_original', $hash)->first();
    }
}
```

### AssinafyDocumentSigner Pivot Model

```php
// app/Models/AssinafyDocumentSigner.php

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class AssinafyDocumentSigner extends Pivot
{
    protected $table = 'assinafy_document_signers';

    protected $fillable = [
        'document_id',
        'signer_id',
        'assinafy_assignment_item_id',
        'sign_order',
        'status',
        'signed_at',
        'rejected_at',
        'decline_reason',
        'metadata',
    ];

    protected $casts = [
        'signed_at' => 'datetime',
        'rejected_at' => 'datetime',
        'metadata' => 'array',
    ];

    /**
     * Check if signed
     */
    public function isSigned(): bool
    {
        return $this->status === 'signed' && $this->signed_at !== null;
    }

    /**
     * Check if rejected
     */
    public function isRejected(): bool
    {
        return $this->status === 'rejected' && $this->rejected_at !== null;
    }
}
```

### AssinafyDocumentStatusHistory Model

```php
// app/Models/AssinafyDocumentStatusHistory.php

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssinafyDocumentStatusHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'document_id',
        'previous_status',
        'new_status',
        'source',
        'payload_snapshot',
        'notes',
    ];

    protected $casts = [
        'payload_snapshot' => 'array',
    ];

    /**
     * The document that owns this history entry
     */
    public function document(): BelongsTo
    {
        return $this->belongsTo(AssinafyDocument::class, 'document_id');
    }
}
```

### AssinafyWebhookDispatch Model

```php
// app/Models/AssinafyWebhookDispatch.php

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AssinafyWebhookDispatch extends Model
{
    use HasFactory;

    protected $fillable = [
        'account_id',
        'external_dispatch_id',
        'event',
        'endpoint',
        'delivered',
        'http_status',
        'response_body',
        'payload',
        'received_at',
        'processed_at',
        'error',
    ];

    protected $casts = [
        'delivered' => 'boolean',
        'received_at' => 'datetime',
        'processed_at' => 'datetime',
    ];

    /**
     * Scope for undelivered dispatches
     */
    public function scopeUndelivered($query)
    {
        return $query->where('delivered', false);
    }

    /**
     * Scope for processing errors
     */
    public function scopeWithError($query)
    {
        return $query->whereNotNull('error')->where('error', '!=', '');
    }

    /**
     * Mark as processed
     */
    public function markAsProcessed(int $httpStatus = 200): void
    {
        $this->update([
            'delivered' => true,
            'http_status' => $httpStatus,
            'processed_at' => now(),
        ]);
    }

    /**
     * Mark as failed
     */
    public function markAsFailed(string $error): void
    {
        $this->update([
            'delivered' => false,
            'error' => $error,
            'processed_at' => now(),
        ]);
    }
}
```

## Running Migrations

```bash
# Create all migrations
php artisan make:migration create_assinafy_signers_table
php artisan make:migration create_assinafy_documents_table
php artisan make:migration create_assinafy_document_signer_table
php artisan make:migration create_assinafy_document_status_history_table
php artisan make:migration create_assinafy_webhook_dispatches_table

# Run migrations
php artisan migrate

# Or run with fresh database
php artisan migrate:fresh
```

## Next Steps

- [Testing Strategy](10-testing-strategy.md)
- [Security Checklist](11-security-checklist.md)
