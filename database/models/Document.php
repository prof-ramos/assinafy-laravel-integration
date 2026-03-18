<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Document extends Model
{
    use HasFactory;

    const STATUS_UPLOADING = 'uploading';
    const STATUS_UPLOADED = 'uploaded';
    const STATUS_METADATA_PROCESSING = 'metadata_processing';
    const STATUS_METADATA_READY = 'metadata_ready';
    const STATUS_PENDING_SIGNATURE = 'pending_signature';
    const STATUS_CERTIFICATING = 'certificating';
    const STATUS_CERTIFICATED = 'certificated';
    const STATUS_REJECTED_BY_SIGNER = 'rejected_by_signer';
    const STATUS_REJECTED_BY_USER = 'rejected_by_user';
    const STATUS_FAILED = 'failed';
    const STATUS_EXPIRED = 'expired';

    protected $fillable = [
        'assinafy_document_id',
        'processo_id',
        'oficio_id',
        'title',
        'file_name',
        'status',
        'signature_method',
        'hash_sha256_original',
        'hash_sha256_certificated',
        'expires_at',
        'certificated_at',
        'metadata',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'certificated_at' => 'datetime',
        'metadata' => 'array',
    ];

    /**
     * Signatários deste documento
     */
    public function signers(): BelongsToMany
    {
        return $this->belongsToMany(Signer::class, 'document_signers')
            ->withPivot(
                'assinafy_assignment_item_id',
                'sign_order',
                'status',
                'signed_at',
                'rejected_at',
                'decline_reason'
            )
            ->withTimestamps()
            ->orderBy('document_signers.sign_order');
    }

    /**
     * Histórico de status do documento
     */
    public function statusHistory(): HasMany
    {
        return $this->hasMany(DocumentStatusHistory::class);
    }

    /**
     * Scope para documentos pendentes de assinatura
     */
    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING_SIGNATURE);
    }

    /**
     * Scope para documentos certificados
     */
    public function scopeCertificated($query)
    {
        return $query->where('status', self::STATUS_CERTIFICATED);
    }

    /**
     * Scope para documentos expirados
     */
    public function scopeExpired($query)
    {
        return $query->where('status', self::STATUS_EXPIRED);
    }

    /**
     * Verifica se o documento está certificado
     */
    public function isCertificated(): bool
    {
        return $this->status === self::STATUS_CERTIFICATED;
    }

    /**
     * Verifica se o documento pode ser assinado
     */
    public function canBeSigned(): bool
    {
        return in_array($this->status, [
            self::STATUS_METADATA_READY,
            self::STATUS_PENDING_SIGNATURE,
        ]);
    }

    /**
     * Verifica se o documento expirou
     */
    public function isExpired(): bool
    {
        return $this->status === self::STATUS_EXPIRED ||
            ($this->expires_at && $this->expires_at->isPast());
    }

    /**
     * Atualiza o status do documento com histórico
     */
    public function updateStatus(string $newStatus, string $source = 'webhook', ?array $payload = null): void
    {
        $previousStatus = $this->status;

        $this->update(['status' => $newStatus]);

        $this->statusHistory()->create([
            'previous_status' => $previousStatus,
            'new_status' => $newStatus,
            'source' => $source,
            'payload_snapshot' => $payload,
        ]);
    }
}
