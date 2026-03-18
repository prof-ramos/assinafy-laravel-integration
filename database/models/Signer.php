<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Signer extends Model
{
    use HasFactory;

    protected $fillable = [
        'assinafy_signer_id',
        'full_name',
        'email',
        'whatsapp_phone_number',
        'document_number',
    ];

    protected $hidden = [
        'document_number',
    ];

    /**
     * Documentos associados a este signatário
     */
    public function documents(): BelongsToMany
    {
        return $this->belongsToMany(Document::class, 'document_signers')
            ->withPivot(
                'assinafy_assignment_item_id',
                'sign_order',
                'status',
                'signed_at',
                'rejected_at',
                'decline_reason'
            )
            ->withTimestamps();
    }

    /**
     * Busca signatário por e-mail
     */
    public function scopeByEmail($query, string $email)
    {
        return $query->where('email', $email);
    }

    /**
     * Busca signatário por documento (CPF/CNPJ)
     */
    public function scopeByDocument($query, string $document)
    {
        return $query->where('document_number', $document);
    }
}
