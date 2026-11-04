<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('security_audit_logs', function (Blueprint $table) {
            $table->bigIncrements('audit_log_id');
            $table->foreignId('actor_user_id')->nullable()->constrained('users', 'user_id')->nullOnDelete();
            $table->foreignId('target_user_id')->nullable()->constrained('users', 'user_id')->nullOnDelete();
            $table->string('event_type', 120);
            $table->enum('severity', ['info', 'warning', 'critical'])->default('info');
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['event_type', 'created_at']);
            $table->index(['target_user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('security_audit_logs');
    }
};
