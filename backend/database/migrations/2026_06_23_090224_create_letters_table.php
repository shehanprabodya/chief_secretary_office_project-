<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('letters', function (Blueprint $table) {
            $table->increments('letter_id');
            $table->unsignedInteger('meeting_id')->nullable(); // optional link to a meeting
            $table->string('sender_name', 255);
            $table->string('title', 255);
            $table->longText('content')->nullable();
            $table->string('designation', 150)->nullable();
            $table->string('signatory_name', 150)->nullable();
            $table->date('signature_date')->nullable();
            $table->enum('status', ['draft', 'pending_approval', 'approved', 'rejected', 'dispatched'])->default('draft');
            $table->unsignedBigInteger('created_by');
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
            $table->unsignedInteger('subject_id')->nullable()->after('meeting_id');
            
            $table->foreign('subject_id')->references('subject_id')->on('subjects')->onDelete('set null');
            $table->foreign('meeting_id')->references('meeting_id')->on('meetings')->onDelete('set null');
            $table->foreign('created_by')->references('user_id')->on('users');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('letters');
    }
};