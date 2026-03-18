# Setup and Configuration

## Environment Requirements

- **PHP:** 7.4 or higher (8.1+ recommended)
- **Laravel:** 8.0 or higher (10.x/11.x recommended)
- **Composer:** 2.0 or higher

## Installation

```bash
composer require assinafy/php-sdk
composer require guzzlehttp/guzzle
```

## Environment Variables

Add to your `.env` file:

```env
# Assinafy API Configuration
ASSINAFY_API_KEY=your_api_key_here
ASSINAFY_ACCOUNT_ID=your_account_id_here
ASSINAFY_WEBHOOK_SECRET=your_webhook_secret_here

# Environment (sandbox|production)
ASSINAFY_ENV=sandbox

# API Base URLs
ASSINAFY_SANDBOX_URL=https://sandbox.assinafy.com.br/v1
ASSINAFY_PRODUCTION_URL=https://api.assinafy.com.br/v1

# Optional: Custom timeouts (in seconds)
ASSINAFY_TIMEOUT=30
ASSINAFY_CONNECT_TIMEOUT=10

# Optional: Webhook endpoint
ASSINAFY_WEBHOOK_URL=https://your-domain.com/webhooks/assinafy
```

## Configuration File

Create `config/assinafy.php`:

```php
<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Assinafy Environment
    |--------------------------------------------------------------------------
    */
    'env' => env('ASSINAFY_ENV', 'sandbox'),

    /*
    |--------------------------------------------------------------------------
    | API Credentials
    |--------------------------------------------------------------------------
    */
    'api_key' => env('ASSINAFY_API_KEY'),
    'account_id' => env('ASSINAFY_ACCOUNT_ID'),
    'webhook_secret' => env('ASSINAFY_WEBHOOK_SECRET'),

    /*
    |--------------------------------------------------------------------------
    | Base URLs
    |--------------------------------------------------------------------------
    */
    'sandbox_url' => env('ASSINAFY_SANDBOX_URL', 'https://sandbox.assinafy.com.br/v1'),
    'production_url' => env('ASSINAFY_PRODUCTION_URL', 'https://api.assinafy.com.br/v1'),

    /*
    |--------------------------------------------------------------------------
    | Connection Settings
    |--------------------------------------------------------------------------
    */
    'timeout' => (int) env('ASSINAFY_TIMEOUT', 30),
    'connect_timeout' => (int) env('ASSINAFY_CONNECT_TIMEOUT', 10),

    /*
    |--------------------------------------------------------------------------
    | Webhook Settings
    |--------------------------------------------------------------------------
    */
    'webhook' => [
        'url' => env('ASSINAFY_WEBHOOK_URL'),
        'route_prefix' => 'api/webhooks/assinafy',
        'middleware' => ['api', 'throttle:webhooks'],
    ],

    /*
    |--------------------------------------------------------------------------
    | Retry Settings
    |--------------------------------------------------------------------------
    */
    'retry' => [
        'enabled' => true,
        'max_attempts' => 3,
        'backoff_multiplier' => 2,
        'retry_on_status' => [429, 500, 502, 503, 504],
    ],

    /*
    |--------------------------------------------------------------------------
    | Logging
    |--------------------------------------------------------------------------
    */
    'logging' => [
        'enabled' => env('ASSINAFY_LOGGING_ENABLED', true),
        'level' => env('ASSINAFY_LOG_LEVEL', 'info'),
        'mask_credentials' => true,
    ],
];
```

## Service Provider Setup

Create `app/Providers/AssinafyServiceProvider.php`:

```php
<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Assinafy\Client;
use App\Services\AssinafyService;
use App\Services\AssinafyWebhookService;

class AssinafyServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(
            __DIR__.'/../../config/assinafy.php',
            'assinafy'
        );

        // Register Assinafy Client as singleton
        $this->app->singleton(Client::class, function () {
            return new Client([
                'api_key' => config('assinafy.api_key'),
                'account_id' => config('assinafy.account_id'),
                'webhook_secret' => config('assinafy.webhook_secret'),
                'base_url' => $this->getBaseUrl(),
                'timeout' => config('assinafy.timeout'),
                'connect_timeout' => config('assinafy.connect_timeout'),
            ]);
        });

        // Register Services
        $this->app->singleton(AssinafyService::class, function ($app) {
            return new AssinafyService(
                $app->make(Client::class),
                $app->make('Illuminate\Log\Logger')
            );
        });

        $this->app->singleton(AssinafyWebhookService::class, function ($app) {
            return new AssinafyWebhookService(
                $app->make(Client::class),
                $app->make('Illuminate\Log\Logger')
            );
        });
    }

    public function boot(): void
    {
        if ($this->app->runningInConsole()) {
            $this->publishes([
                __DIR__.'/../config/assinafy.php' => config_path('assinafy.php'),
            ], 'assinafy-config');
        }
    }

    protected function getBaseUrl(): string
    {
        return config('assinafy.env') === 'production'
            ? config('assinafy.production_url')
            : config('assinafy.sandbox_url');
    }
}
```

Register the provider in `config/app.php`:

```php
'providers' => [
    // ...
    App\Providers\AssinafyServiceProvider::class,
],
```

Or for Laravel 11+, in `bootstrap/providers.php`:

```php
return [
    // ...
    App\Providers\AssinafyServiceProvider::class,
];
```

## Validation Command

Create `app/Console/Commands/ValidateAssinafyConfig.php`:

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Assinafy\Client;

class ValidateAssinafyConfig extends Command
{
    protected $signature = 'assinafy:validate-config';
    protected $description = 'Validate Assinafy configuration';

    public function handle(): int
    {
        $this->info('Validating Assinafy configuration...');

        $checks = [
            'api_key' => config('assinafy.api_key'),
            'account_id' => config('assinafy.account_id'),
            'webhook_secret' => config('assinafy.webhook_secret'),
            'base_url' => config('assinafy.env') === 'production' 
                ? config('assinafy.production_url') 
                : config('assinafy.sandbox_url'),
        ];

        $allValid = true;

        foreach ($checks as $key => $value) {
            if (empty($value)) {
                $this->error("✗ {$key} is missing");
                $allValid = false;
            } else {
                $this->info("✓ {$key} is configured");
            }
        }

        if ($allValid) {
            $this->info("\nAll configuration values are present!");
            return 0;
        }

        $this->error("\nPlease check your .env file for missing values.");
        return 1;
    }
}
```

## Environment Templates

### Development (.env)
```env
APP_ENV=local
ASSINAFY_ENV=sandbox
ASSINAFY_LOGGING_ENABLED=true
ASSINAFY_LOG_LEVEL=debug
```

### Production (.env.production)
```env
APP_ENV=production
ASSINAFY_ENV=production
ASSINAFY_LOGGING_ENABLED=true
ASSINAFY_LOG_LEVEL=warning
```
