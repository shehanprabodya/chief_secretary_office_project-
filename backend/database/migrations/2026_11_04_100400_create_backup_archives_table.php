<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('backup_archives', function (Blueprint $table) {
            $table->bigIncrements('backup_id');
            $table->enum('type', ['database', 'files', 'full'])->default('full');
            $table->string('storage_disk', 50)->default('local');
            $table->string('storage_path', 255)->unique();
            $table->unsignedBigInteger('size_bytes')->nullable();
            $table->string('sha256_checksum', 64);
            $table->string('encryption_algorithm', 50)->default('AES-256-GCM');
            $table->timestamp('retention_until')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users', 'user_id')->nullOnDelete();
            $table->enum('status', ['available', 'restored', 'deleted', 'failed'])->default('available');
            $table->timestamp('restored_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index(['type', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('backup_archives');
    }
};
