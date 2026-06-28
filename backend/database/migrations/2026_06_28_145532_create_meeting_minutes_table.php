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
        Schema::create('meeting_minutes', function (Blueprint $table) {
            $table->increments('minute_id');
            $table->unsignedInteger('meeting_id');
            $table->longText('discussion_summary')->nullable();
            $table->enum('status', ['draft', 'pending_approval', 'approved'])->default('draft');
            $table->unsignedInteger('created_by');
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();

            $table->foreign('meeting_id')->references('meeting_id')->on('meetings')->onDelete('cascade');
            $table->foreign('created_by')->references('user_id')->on('users');
            $table->unique('meeting_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('meeting_minutes');
    }
};
