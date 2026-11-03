<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('approval_workflow_steps', function (Blueprint $table) {
            $table->unsignedBigInteger('assigned_to')->nullable()->after('required_role');
            $table->foreign('assigned_to')
                ->references('user_id')
                ->on('users')
                ->nullOnDelete();
            $table->index(['document_id', 'step_order', 'status', 'assigned_to'], 'approval_steps_document_stage_assignee_idx');
        });
    }

    public function down(): void
    {
        Schema::table('approval_workflow_steps', function (Blueprint $table) {
            $table->dropIndex('approval_steps_document_stage_assignee_idx');
            $table->dropForeign(['assigned_to']);
            $table->dropColumn('assigned_to');
        });
    }
};
