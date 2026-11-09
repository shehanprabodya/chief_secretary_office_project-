<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('must_change_password')->default(false)->after('invitation_pending');
            $table->index('must_change_password');
        });

        Schema::create('email_distributions', function (Blueprint $table) {
            $table->bigIncrements('distribution_id');
            $table->string('document_type', 20);
            $table->unsignedBigInteger('document_id');
            $table->unsignedBigInteger('recipient_user_id')->nullable();
            $table->string('recipient_key', 160);
            $table->string('recipient_name', 255)->nullable();
            $table->string('recipient_email', 255);
            $table->string('email_subject', 500);
            $table->enum('status', ['pending', 'queued', 'sending', 'sent', 'failed'])->default('pending');
            $table->unsignedSmallInteger('attempt_count')->default(0);
            $table->timestamp('last_attempted_at')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->text('error_details')->nullable();
            $table->unsignedBigInteger('created_by');
            $table->timestamps();

            $table->foreign('recipient_user_id')->references('user_id')->on('users')->nullOnDelete();
            $table->foreign('created_by')->references('user_id')->on('users');
            $table->index(['document_type', 'document_id', 'status']);
            $table->unique(['document_type', 'document_id', 'recipient_key'], 'email_distribution_recipient_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_distributions');
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['must_change_password']);
            $table->dropColumn('must_change_password');
        });
    }
};
