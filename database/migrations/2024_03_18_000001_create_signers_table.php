<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('signers', function (Blueprint $table) {
            $table->id();
            $table->string('assinafy_signer_id')->unique()->comment('ID do signatário na Assinafy');
            $table->string('full_name');
            $table->string('email');
            $table->string('whatsapp_phone_number')->nullable();
            $table->string('document_number')->nullable()->comment('CPF/CNPJ se disponível internamente');
            $table->timestamps();

            $table->index('email');
            $table->index('document_number');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('signers');
    }
};
