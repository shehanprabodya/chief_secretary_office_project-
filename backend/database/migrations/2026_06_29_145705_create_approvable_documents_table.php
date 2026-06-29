<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('approvable_documents', function (Blueprint $table) {
             $table->increments('document_id');
            $table->string('reference_id', 50)->unique(); // SPC-DEV/2024/082
            $table->string('document_type', 50); // 'letter', 'grant', 'training_request', 'hr_transfer'
            $table->unsignedInteger('source_id')->nullable(); // FK to letters.letter_id etc, when applicable
            $table->string('subject', 255);
            $table->text('description')->nullable();
            $table->longText('full_content')->nullable(); // rendered document body (for preview pane)
            $table->decimal('amount', 15, 2)->nullable(); // for grants/budget requests
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->unsignedInteger('submitted_by');
            $table->unsignedInteger('current_step_order')->default(1);
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();

            $table->foreign('submitted_by')->references('user_id')->on('users');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('approvable_documents');
    }
};
