<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_excuse_requests', function (Blueprint $table) {
            $table->bigIncrements('excuse_request_id');
            $table->unsignedInteger('meeting_id');
            $table->unsignedBigInteger('user_id');
            $table->enum('reason_category', [
                'official_duty',
                'medical',
                'schedule_conflict',
                'other',
            ]);
            $table->text('reason_details');
            $table->enum('status', [
                'pending',
                'approved',
                'rejected',
                'withdrawn',
            ])->default('pending');
            $table->unsignedBigInteger('reviewed_by')->nullable();
            $table->text('review_comment')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->foreign('meeting_id')
                ->references('meeting_id')
                ->on('meetings')
                ->cascadeOnDelete();
            $table->foreign('user_id')
                ->references('user_id')
                ->on('users')
                ->cascadeOnDelete();
            $table->foreign('reviewed_by')
                ->references('user_id')
                ->on('users')
                ->nullOnDelete();

            $table->unique(['meeting_id', 'user_id']);
            $table->index(['meeting_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_excuse_requests');
    }
};
