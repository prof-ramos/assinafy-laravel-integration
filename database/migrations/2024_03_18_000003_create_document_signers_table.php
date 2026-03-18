<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_signers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained()->onDelete('cascade');
            $table->foreignId('signer_id')->constrained('signers')->onDelete('cascade');
            $table->string('assinafy_assignment_item_id')->nullable();
            $table->integer('sign_order')->default(0);
            $table->string('status', 50)->default('pending');
            $table->timestamp('signed_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->text('decline_reason')->nullable();
            $table->timestamps();

            $table->unique(['document_id', 'signer_id']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_signers');
    }
};
