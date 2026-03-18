<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('webhook_dispatches', function (Blueprint $table) {
            $table->id();
            $table->string('account_id')->nullable();
            $table->string('event');
            $table->string('external_dispatch_id')->nullable();
            $table->string('endpoint');
            $table->boolean('delivered')->default(false);
            $table->integer('http_status')->nullable();
            $table->text('response_body')->nullable();
            $table->json('payload');
            $table->timestamp('received_at');
            $table->timestamp('processed_at')->nullable();
            $table->text('error')->nullable();
            $table->timestamps();

            $table->index('event');
            $table->index('delivered');
            $table->index('external_dispatch_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('webhook_dispatches');
    }
};
