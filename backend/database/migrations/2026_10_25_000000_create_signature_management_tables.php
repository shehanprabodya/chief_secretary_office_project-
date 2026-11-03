<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_signatures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users', 'user_id')->cascadeOnDelete();
            $table->string('encrypted_file_path', 500);
            $table->string('mime_type', 80);
            $table->unsignedInteger('file_size')->default(0);
            $table->string('encryption_version', 20)->default('v1');
            $table->boolean('is_active')->default(false);
            $table->foreignId('uploaded_by')->nullable()->constrained('users', 'user_id')->nullOnDelete();
            $table->timestamp('uploaded_at')->nullable();
            $table->timestamp('deactivated_at')->nullable();
            $table->timestamps();
        });

        Schema::create('signing_delegations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('primary_signer_id')->constrained('users', 'user_id')->cascadeOnDelete();
            $table->foreignId('delegated_signer_id')->constrained('users', 'user_id')->cascadeOnDelete();
            $table->foreignId('authorized_by')->nullable()->constrained('users', 'user_id')->nullOnDelete();
            $table->text('reason')->nullable();
            $table->date('start_date');
            $table->date('end_date');
            $table->enum('status', ['active', 'revoked', 'expired'])->default('active');
            $table->timestamp('authorized_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->foreignId('revoked_by')->nullable()->constrained('users', 'user_id')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('document_signatures', function (Blueprint $table) {
            $table->id();
            $table->string('document_type', 50);
            $table->unsignedBigInteger('document_id');
            $table->foreignId('signer_id')->constrained('users', 'user_id')->cascadeOnDelete();
            $table->foreignId('primary_signer_id')->nullable()->constrained('users', 'user_id')->nullOnDelete();
            $table->foreignId('signature_id')->nullable()->constrained('user_signatures')->nullOnDelete();
            $table->enum('signing_type', ['PRIMARY', 'DELEGATED'])->default('PRIMARY');
            $table->foreignId('delegation_id')->nullable()->constrained('signing_delegations')->nullOnDelete();
            $table->string('document_reference', 200)->nullable();
            $table->string('document_hash', 128)->nullable();
            $table->string('signed_pdf_path', 500)->nullable();
            $table->timestamp('signed_at')->nullable();
            $table->string('authentication_method', 50)->default('password');
            $table->timestamps();
        });

        Schema::create('signature_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('actor_id')->nullable()->constrained('users', 'user_id')->nullOnDelete();
            $table->foreignId('signature_id')->nullable()->constrained('user_signatures')->nullOnDelete();
            $table->foreignId('document_signature_id')->nullable()->constrained('document_signatures')->nullOnDelete();
            $table->string('action', 80);
            $table->string('document_type', 50)->nullable();
            $table->unsignedBigInteger('document_id')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->enum('result', ['success', 'failure'])->default('success');
            $table->text('failure_reason')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('signature_audit_logs');
        Schema::dropIfExists('document_signatures');
        Schema::dropIfExists('signing_delegations');
        Schema::dropIfExists('user_signatures');
    }
};
