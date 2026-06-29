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
        Schema::create('approval_workflow_steps', function (Blueprint $table) {
            $table->increments('step_id');
            $table->unsignedInteger('document_id');
            $table->string('step_label', 100); // 'Officer', 'Dept Head', 'Deputy', 'Chief Secretary'
            $table->unsignedTinyInteger('step_order');
            $table->string('required_role', 50); // matches roles.role_name
            $table->enum('status', ['waiting', 'pending', 'approved', 'rejected'])->default('waiting');
            $table->unsignedBigInteger('actioned_by')->nullable();
            $table->timestamp('actioned_at')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('document_id')->references('document_id')->on('approvable_documents')->onDelete('cascade');
            $table->foreign('actioned_by')->references('user_id')->on('users');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('approval_workflow_steps');
    }
};
