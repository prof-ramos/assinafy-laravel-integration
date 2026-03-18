<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->string('assinafy_document_id')->unique()->comment('ID do documento na Assinafy');
            $table->string('processo_id')->nullable()->comment('ID do processo/ofício interno');
            $table->string('oficio_id')->nullable()->comment('ID do ofício na tabela de ofícios');
            $table->string('title');
            $table->string('file_name');
            $table->string('status', 50)->default('uploading');
            $table->string('signature_method', 20)->nullable();
            $table->string('hash_sha256_original', 64)->nullable();
            $table->string('hash_sha256_certificated', 64)->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('certificated_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('processo_id');
            $table->index('oficio_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
