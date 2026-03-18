# Security Checklist

This section covers security best practices for integrating Assinafy API into your Laravel application.

## Credential Management

### ✓ API Key Protection

**Never** expose API keys in:
- Frontend JavaScript
- Version control (git)
- Log files
- Error messages
- API responses

**Do** store API keys in:
- Environment variables (`.env`)
- Secret managers (AWS Secrets Manager, Azure Key Vault)
- Encrypted configuration files

```php
// config/assinafy.php - NEVER commit actual keys
'api_key' => env('ASSINAFY_API_KEY'), // ✓ Correct
'api_key' => 'sk_live_xxxxx',         // ✗ WRONG
```

### ✓ Environment Variable Best Practices

```env
# .env (never commit)
ASSINAFY_API_KEY=sk_live_xxxxx
ASSINAFY_ACCOUNT_ID=acct_xxxxx
ASSINAFY_WEBHOOK_SECRET=whsec_xxxxx

# .env.example (safe to commit)
ASSINAFY_API_KEY=
ASSINAFY_ACCOUNT_ID=
ASSINAFY_WEBHOOK_SECRET=
```

### ✓ Credential Rotation

Implement periodic credential rotation:

```php
// app/Console/Commands/AssinafyRotateCredentials.php

public function handle(): int
{
    $currentKey = config('assinafy.api_key');
    
    // Generate new key via Assinafy dashboard
    // Update .env file
    // Clear config cache
    
    $this->info('Credentials rotated. Update .env and run: php artisan config:clear');
    return 0;
}
```

## Webhook Security

### ✓ Webhook Signature Validation

Always verify webhook signatures:

```php
// app/Http/Middleware/ValidateAssinafyWebhook.php

<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ValidateAssinafyWebhook
{
    public function handle(Request $request, Closure $next): Response
    {
        $signature = $request->header('X-Webhook-Signature');
        $payload = $request->getContent();
        $secret = config('assinafy.webhook_secret');

        if (!$signature || !$secret) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Verify signature (adjust based on Assinafy's actual method)
        $expectedSignature = hash_hmac('sha256', $payload, $secret);

        if (!hash_equals($expectedSignature, $signature)) {
            \Log::warning('Invalid webhook signature', [
                'ip' => $request->ip(),
                'signature' => $signature,
            ]);

            return response()->json(['error' => 'Invalid signature'], 401);
        }

        return $next($request);
    }
}
```

### ✓ IP Whitelisting (Optional)

```php
// app/Http/Middleware/AssinafyIpWhitelist.php

<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class AssinafyIpWhitelist
{
    private array $allowedIps = [
        // Assinafy webhook IPs - obtain from their documentation
        '192.0.2.1',
        '203.0.113.0/24',
    ];

    public function handle(Request $request, Closure $next)
    {
        $clientIp = $request->ip();

        if (!$this->isIpAllowed($clientIp)) {
            \Log::warning('Webhook from unauthorized IP', [
                'ip' => $clientIp,
            ]);

            return response()->json(['error' => 'Forbidden'], 403);
        }

        return $next($request);
    }

    private function isIpAllowed(string $ip): bool
    {
        foreach ($this->allowedIps as $allowed) {
            if (str_contains($allowed, '/')) {
                // CIDR notation check
                if ($this->matchCidr($ip, $allowed)) {
                    return true;
                }
            } elseif ($ip === $allowed) {
                return true;
            }
        }

        return false;
    }

    private function matchCidr(string $ip, string $cidr): bool
    {
        [$subnet, $mask] = explode('/', $cidr);
        $ipLong = ip2long($ip);
        $subnetLong = ip2long($subnet);
        $maskLong = -1 << (32 - $mask);

        return ($ipLong & $maskLong) === ($subnetLong & $maskLong);
    }
}
```

### ✓ Idempotency for Webhooks

```php
// app/Services/AssinafyWebhookService.php

public function process(array $payload): array
{
    $dispatchId = $payload['dispatch_id'] ?? null;

    if (!$dispatchId) {
        throw new \InvalidArgumentException('Missing dispatch_id');
    }

    // Check if already processed
    $existing = AssinafyWebhookDispatch::where('external_dispatch_id', $dispatchId)
        ->where('delivered', true)
        ->first();

    if ($existing) {
        \Log::info('Webhook already processed', [
            'dispatch_id' => $dispatchId,
            'processed_at' => $existing->processed_at,
        ]);

        return ['processed' => false, 'reason' => 'already_processed'];
    }

    // Store raw webhook
    $dispatch = AssinafyWebhookDispatch::create([
        'external_dispatch_id' => $dispatchId,
        'event' => $payload['event'],
        'payload' => json_encode($payload),
        'received_at' => now(),
    ]);

    try {
        // Process the event
        $this->handleEvent($payload['event'], $payload['data'] ?? []);

        // Mark as delivered
        $dispatch->markAsProcessed(200);

        return ['processed' => true];

    } catch (\Exception $e) {
        $dispatch->markAsFailed($e->getMessage());
        throw $e;
    }
}
```

## Input Validation

### ✓ Validate All Inputs

```php
// app/Http/Requests/UploadDocumentRequest.php

<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UploadDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Implement proper authorization
    }

    public function rules(): array
    {
        return [
            'file' => 'required|file|mimes:pdf|max:10240', // Max 10MB
            'title' => 'required|string|max:255',
            'signers' => 'required|array|min:1|max:10',
            'signers.*.full_name' => 'required|string|max:255',
            'signers.*.email' => 'required|email|max:255',
            'signers.*.whatsapp_phone_number' => 'nullable|string|max:20',
            'message' => 'nullable|string|max:1000',
            'method' => 'required|in:virtual,collect',
            'expires_at' => 'nullable|date|after:now',
        ];
    }

    public function messages(): array
    {
        return [
            'file.required' => 'A PDF file is required',
            'file.mimes' => 'Only PDF files are allowed',
            'file.max' => 'File size cannot exceed 10MB',
            'signers.*.email.email' => 'Invalid email address for :attribute',
        ];
    }
}
```

### ✓ Sanitize User Input

```php
use Illuminate\Support\Str;

public function createOrGetSigner(array $data): string
{
    // Sanitize inputs
    $data['full_name'] = trim(strip_tags($data['full_name']));
    $data['email'] = trim(strtolower($data['email']));
    
    if (isset($data['whatsapp_phone_number'])) {
        // Remove non-numeric characters
        $data['whatsapp_phone_number'] = preg_replace('/[^0-9+]/', '', $data['whatsapp_phone_number']);
    }

    // Additional validation...
}
```

## API Security

### ✓ Rate Limiting

```php
// routes/web.php or routes/api.php

Route::middleware(['throttle:assinafy'])->group(function () {
    Route::post('documents/upload', [DocumentController::class, 'upload']);
    Route::post('documents/{id}/sign', [DocumentController::class, 'requestSignature']);
});

// config/app.php - RouteServiceProvider

protected function configureRateLimiting(): void
{
    RateLimiter::for('assinafy', function (Request $request) {
        return Limit::perMinute(30)->by($request->user()?->id ?: $request->ip());
    });
}
```

### ✓ Request Timeout

```php
// config/assinafy.php
'timeout' => 30,        // Overall request timeout
'connect_timeout' => 10, // Connection timeout
```

### ✓ TLS/SSL Only

```php
// Force HTTPS in production
if (app()->environment('production')) {
    URL::forceScheme('https');
}

// Or use middleware
'url' => env('APP_URL', 'http://localhost'),
'asset_url' => env('ASSET_URL'),
```

## Data Protection

### ✓ Encrypt Sensitive Data

```php
// app/Models/AssinafySigner.php

protected $casts = [
    'document_number' => 'encrypted', // Encrypt CPF/CNPJ
];

// Or use accessors
public function setDocumentNumberAttribute($value)
{
    $this->attributes['document_number'] = encrypt($value);
}

public function getDocumentNumberAttribute($value)
{
    return decrypt($value);
}
```

### ✓ Log Masking

```php
// app/Logging/AssinafyLogger.php

<?php

namespace App\Logging;

use Monolog\Processor\ProcessorInterface;

class AssinafySensitiveDataProcessor implements ProcessorInterface
{
    private array $sensitiveKeys = [
        'api_key',
        'password',
        'token',
        'secret',
        'cpf',
        'cnpj',
        'document_number',
    ];

    public function __invoke(array $record): array
    {
        if (isset($record['context'])) {
            $record['context'] = $this->maskSensitiveData($record['context']);
        }

        if (isset($record['extra'])) {
            $record['extra'] = $this->maskSensitiveData($record['extra']);
        }

        return $record;
    }

    private function maskSensitiveData(array $data): array
    {
        foreach ($data as $key => $value) {
            if (in_array(strtolower($key), $this->sensitiveKeys)) {
                $data[$key] = str_repeat('*', strlen($value) - 4) . substr($value, -4);
            } elseif (is_array($value)) {
                $data[$key] = $this->maskSensitiveData($value);
            }
        }

        return $data;
    }
}
```

### ✓ Database Encryption

```php
// Add to your migration
$table->text('encrypted_data')->nullable();

// In your model
protected $casts = [
    'encrypted_data' => 'encrypted',
];
```

## Authentication & Authorization

### ✓ Laravel Policies

```php
// app/Policies/AssinafyDocumentPolicy.php

<?php

namespace App\Policies;

use App\Models\AssinafyDocument;
use App\Models\User;

class AssinafyDocumentPolicy
{
    public function view(User $user, AssinafyDocument $document): bool
    {
        return $document->processo_id 
            && $user->canAccessProcesso($document->processo_id);
    }

    public function upload(User $user): bool
    {
        return $user->hasPermission('documents.upload');
    }

    public function requestSignature(User $user, AssinafyDocument $document): bool
    {
        return $document->processo_id 
            && $user->canAccessProcesso($document->processo_id)
            && $user->hasPermission('documents.sign');
    }

    public function download(User $user, AssinafyDocument $document): bool
    {
        return $document->processo_id 
            && $user->canAccessProcesso($document->processo_id);
    }
}
```

### ✓ Controller Authorization

```php
public function upload(Request $request)
{
    $this->authorize('upload', AssinafyDocument::class);

    // ... rest of the method
}

public function download(string $id)
{
    $document = AssinafyDocument::findOrFail($id);
    $this->authorize('download', $document);

    // ... rest of the method
}
```

## Audit Logging

### ✓ Activity Logging

```php
// app/Listeners/LogAssinafyActivity.php

<?php

namespace App\Listeners;

use App\Events\AssinafyDocumentUploaded;
use App\Models\ActivityLog;

class LogAssinafyActivity
{
    public function handle(AssinafyDocumentUploaded $event): void
    {
        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'assinafy.document.uploaded',
            'subject_type' => get_class($event->document),
            'subject_id' => $event->document->id,
            'changes' => [
                'document_id' => $event->document->assinafy_document_id,
                'file_name' => $event->document->file_name,
            ],
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }
}
```

## Security Headers

### ✓ CORS Configuration

```php
// config/cors.php

'paths' => ['api/assinafy/*'],

'allowed_methods' => ['POST', 'GET', 'OPTIONS'],

'allowed_origins' => [
    env('APP_URL'),
    env('FRONTEND_URL'),
],

'allowed_headers' => ['Content-Type', 'X-Webhook-Signature'],

'exposed_headers' => [],

'max_age' => 0,

'supports_credentials' => true,
```

### ✓ Security Headers Middleware

```bash
composer require laravel/horizon
```

Or add to `app/Http/Kernel.php`:

```php
protected $middlewareGroups = [
    'web' => [
        // ...
        \App\Http\Middleware\SetSecurityHeaders::class,
    ],
];
```

```php
// app/Http/Middleware/SetSecurityHeaders.php

<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class SetSecurityHeaders
{
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('X-XSS-Protection', '1; mode=block');
        $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        $response->headers->set('Content-Security-Policy', "default-src 'self'");

        return $response;
    }
}
```

## Pre-Deployment Security Checklist

- [ ] API credentials in environment variables only
- [ ] `.env` file in `.gitignore`
- [ ] Webhook signature validation implemented
- [ ] Input validation on all endpoints
- [ ] Rate limiting configured
- [ ] HTTPS enforced in production
- [ ] Security headers configured
- [ ] Database encryption for sensitive fields
- [ ] Log masking implemented
- [ ] Audit logging enabled
- [ ] CORS properly configured
- [ ] Authentication/authorization policies defined

## Next Steps

- [Deployment Checklist](12-deployment-checklist.md)
