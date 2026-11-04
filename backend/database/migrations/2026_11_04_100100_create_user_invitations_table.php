<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_invitations', function (Blueprint $table) {
            $table->bigIncrements('invitation_id');
            $table->foreignId('user_id')->constrained('users', 'user_id')->cascadeOnDelete();
            $table->string('email', 255);
            $table->string('token_hash', 255);
            $table->string('locale', 5)->default('en');
            $table->timestamp('expires_at');
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('invalidated_at')->nullable();
            $table->timestamp('last_sent_at')->nullable();
            $table->unsignedInteger('resent_count')->default(0);
            $table->foreignId('invited_by')->nullable()->constrained('users', 'user_id')->nullOnDelete();
            $table->timestamps();

            $table->index(['user_id', 'accepted_at', 'invalidated_at'], 'user_invites_status_idx');
            $table->index(['email', 'expires_at'], 'user_invites_email_exp_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_invitations');
    }
};
