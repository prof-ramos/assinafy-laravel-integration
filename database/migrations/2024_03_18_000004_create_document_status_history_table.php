<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_status_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained()->onDelete('cascade');
            $table->string('previous_status', 50)->nullable();
            $table->string('new_status', 50);
            $table->string('source', 20)->default('webhook');
            $table->json('payload_snapshot')->nullable();
            $table->timestamps();

            $table->index('document_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_status_history');
    }
};
