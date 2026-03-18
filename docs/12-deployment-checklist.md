# Deployment Checklist

This section covers the complete checklist for deploying the Assinafy integration to production.

## Pre-Deployment Checklist

### Configuration

- [ ] Set `APP_ENV=production` in `.env`
- [ ] Set `APP_DEBUG=false` in `.env`
- [ ] Set `ASSINAFY_ENV=production` in `.env`
- [ ] Configure production `ASSINAFY_API_KEY`
- [ ] Configure production `ASSINAFY_ACCOUNT_ID`
- [ ] Configure production `ASSINAFY_WEBHOOK_SECRET`
- [ ] Set `ASSINAFY_PRODUCTION_URL=https://api.assinafy.com.br/v1`
- [ ] Set production `ASSINAFY_WEBHOOK_URL`
- [ ] Clear config cache: `php artisan config:clear`
- [ ] Rebuild config: `php artisan config:cache`

### Environment Variables Template

```env
# Production Environment Template
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-production-domain.com

# Assinafy Production Configuration
ASSINAFY_ENV=production
ASSINAFY_API_KEY=your_production_api_key
ASSINAFY_ACCOUNT_ID=your_production_account_id
ASSINAFY_WEBHOOK_SECRET=your_production_webhook_secret
ASSINAFY_PRODUCTION_URL=https://api.assinafy.com.br/v1
ASSINAFY_TIMEOUT=30
ASSINAFY_CONNECT_TIMEOUT=10
ASSINAFY_WEBHOOK_URL=https://your-production-domain.com/api/webhooks/assinafy

# Logging
ASSINAFY_LOGGING_ENABLED=true
ASSINAFY_LOG_LEVEL=warning

# Database (use production credentials)
DB_CONNECTION=mysql
DB_HOST=your_production_db_host
DB_PORT=3306
DB_DATABASE=your_production_db
DB_USERNAME=your_production_db_user
DB_PASSWORD=your_production_db_password

# Queue (recommended for webhook processing)
QUEUE_CONNECTION=redis
```

### Database Migration

- [ ] Backup current database
- [ ] Review migrations: `php artisan migrate:status`
- [ ] Test migrations on staging
- [ ] Run migrations: `php artisan migrate --force`
- [ ] Verify tables created: `assinafy_signers`, `assinafy_documents`, etc.

### Dependencies

- [ ] Run `composer install --optimize-autoloader --no-dev`
- [ ] Verify Assinafy SDK version: `composer show assinafy/php-sdk`
- [ ] Run `npm ci --production` (if using frontend assets)

## Verification Tests

### Configuration Verification

```bash
# Run the config validation command
php artisan assinafy:validate-config
```

### API Connection Test

```php
// app/Console/Commands/TestAssinafyConnection.php

<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Assinafy\Client;

class TestAssinafyConnection extends Command
{
    protected $signature = 'assinafy:test-connection';
    protected $description = 'Test connection to Assinafy API';

    public function handle(): int
    {
        $this->info('Testing Assinafy API connection...');

        try {
            $client = app(Client::class);
            
            // Test API key
            $statuses = $client->documents()->statuses();
            $this->info('✓ API authentication successful');

            // Test account access
            $documents = $client->documents()->list(
                config('assinafy.account_id'),
                ['per-page' => 1]
            );
            $this->info('✓ Account access verified');

            // Display current environment
            $this->table(
                ['Setting', 'Value'],
                [
                    ['Environment', config('assinafy.env')],
                    ['Base URL', config('assinafy.env') === 'production' 
                        ? config('assinafy.production_url') 
                        : config('assinafy.sandbox_url')],
                    ['Account ID', config('assinafy.account_id')],
                ]
            );

            $this->info("\n✓ All tests passed!");
            return 0;

        } catch (\Exception $e) {
            $this->error("✗ Connection failed: {$e->getMessage()}");
            return 1;
        }
    }
}
```

Run: `php artisan assinafy:test-connection`

### Webhook Endpoint Test

```bash
# Test webhook endpoint is accessible
curl -X POST https://your-domain.com/api/webhooks/assinafy \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: test" \
  -d '{"event":"test","data":{}}'
```

## Webhook Configuration

### Register Webhook URL

1. Access Assinafy dashboard (production)
2. Navigate to Webhooks settings
3. Add your production webhook URL:
   ```
   https://your-domain.com/api/webhooks/assinafy
   ```
4. Configure events to subscribe:
   - `document_certificated`
   - `signer_signed_document`
   - `signer_rejected_document`
   - `document_metadata_ready`
   - `document_processing_failed`
5. Save and verify the webhook secret

### Webhook Route Registration

```php
// routes/api.php
Route::prefix('webhooks')
    ->middleware(['api', 'throttle:webhooks', 'validate.assinafy.webhook'])
    ->group(function () {
        Route::post('assinafy', [AssinafyWebhookController::class, 'handle'])
            ->name('assinafy.webhook');
    });
```

## Queue Configuration (Recommended)

### Setup Queue Workers

```env
# .env
QUEUE_CONNECTION=redis
```

```bash
# Start queue workers
php artisan queue:work redis --queue=assinafy --tries=3 --timeout=300
```

### Supervisor Configuration

```ini
# /etc/supervisor/conf.d/assinafy-worker.conf

[program:assinafy-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/your-app/artisan queue:work redis --queue=assinafy --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/your-app/storage/logs/assinafy-worker.log
stopwaitsecs=3600
```

```bash
# Update and start supervisor
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start assinafy-worker:*
```

## Monitoring Setup

### Log Monitoring

```php
// config/logging.php - Add dedicated channel

'assinafy' => [
    'driver' => 'daily',
    'path' => storage_path('logs/assinafy.log'),
    'level' => env('ASSINAFY_LOG_LEVEL', 'warning'),
    'days' => 30,
],
```

### Health Check Endpoint

```php
// routes/api.php
Route::get('health/assinafy', function () {
    try {
        $client = app(Client::class);
        $client->documents()->statuses();
        
        return response()->json([
            'status' => 'ok',
            'environment' => config('assinafy.env'),
            'timestamp' => now()->toIso8601String(),
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => $e->getMessage(),
        ], 503);
    }
});
```

## Rollback Procedures

### Database Rollback

```bash
# Rollback migrations if needed
php artisan migrate:rollback --step=5

# Or rollback to specific batch
php artisan migrate:rollback --batch=[batch_number]
```

### Code Rollback

```bash
# Using Git
git revert HEAD
git push

# Or using deployment tags
git checkout tags/v1.0.1
git push -f origin main
```

### Environment Rollback

```bash
# Restore previous .env
cp .env.backup .env

# Clear config cache
php artisan config:clear
php artisan config:cache
```

## Post-Deployment Verification

### Immediate Checks

- [ ] Application accessible: `curl https://your-domain.com`
- [ ] Health check passing: `curl https://your-domain.com/api/health/assinafy`
- [ ] Queue workers running: `php artisan queue:failed`
- [ ] Logs accessible: `tail -f storage/logs/assinafy.log`
- [ ] Database connectivity: `php artisan db:show`

### Integration Tests

```bash
# Run integration tests against production (carefully!)
php artisan test --testsuite=Integration --env=production
```

### Monitoring Dashboards

Set up alerts for:
- API error rate > 5%
- Queue jobs failing
- Webhook delivery failures
- Response time > 5 seconds

## Maintenance

### Regular Tasks

**Daily:**
- Monitor Assinafy logs for errors
- Check queue failed jobs

**Weekly:**
- Review webhook dispatch failures
- Verify document status sync

**Monthly:**
- Review and rotate API keys if needed
- Archive old webhook dispatch records
- Review document retention policy

### Log Rotation

```bash
# Logrotate configuration for Assinafy logs

/var/www/your-app/storage/logs/assinafy-*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        # Reload queue workers if needed
        systemctl reload assinafy-worker
    endscript
}
```

## Troubleshooting

### Common Issues

**Issue:** Webhooks not being received
```bash
# Check webhook signature
php artisan tinker
>>> config('assinafy.webhook_secret')

# Check webhook logs
tail -f storage/logs/assinafy.log | grep webhook
```

**Issue:** Documents stuck in `uploading` status
```bash
# Check API timeout
php artisan tinker
>>> config('assinafy.timeout')

# Manually check document status
php artisan assinafy:check-status [document_id]
```

**Issue:** Queue jobs failing
```bash
# View failed jobs
php artisan queue:failed

# Retry specific job
php artisan queue:retry [job_id]

# Retry all failed jobs
php artisan queue:retry all
```

## Support Contacts

- **Assinafy Support:** suporte@assinafy.com.br
- **Documentation:** https://docs.assinafy.com.br
- **Status Page:** https://status.assinafy.com.br

## Deployment Script Template

```bash
#!/bin/bash
# deploy.sh

set -e

echo "Starting Assinafy deployment..."

# Pull latest code
git pull origin main

# Install dependencies
composer install --optimize-autoloader --no-dev
npm ci --production

# Clear and cache config
php artisan config:clear
php artisan config:cache

# Run migrations
php artisan migrate --force

# Clear caches
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# Restart queue workers
php artisan queue:restart

# Verify connection
php artisan assinafy:test-connection

echo "Deployment complete!"
```

## Complete Checklist Summary

| Category | Item | Status |
|----------|------|--------|
| Config | Production `.env` configured | ⬜ |
| Config | API credentials set | ⬜ |
| Config | Webhook URL configured | ⬜ |
| Database | Migrations run | ⬜ |
| Database | Backup created | ⬜ |
| Webhook | URL registered in Assinafy | ⬜ |
| Webhook | Signature validation working | ⬜ |
| Queue | Workers running | ⬜ |
| Queue | Supervisor configured | ⬜ |
| Monitoring | Health check accessible | ⬜ |
| Monitoring | Logging configured | ⬜ |
| Testing | Connection verified | ⬜ |
| Testing | Integration tests passed | ⬜ |
| Security | HTTPS enforced | ⬜ |
| Security | CORS configured | ⬜ |
| Security | Rate limiting active | ⬜ |
| Documentation | Runbook documented | ⬜ |
| Documentation | Rollback procedure tested | ⬜ |

---

**Document Version:** 1.0  
**Last Updated:** 2025-03-18
