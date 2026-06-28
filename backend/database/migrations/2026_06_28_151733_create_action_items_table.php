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
        Schema::create('action_items', function (Blueprint $table) {
            $table->increments('action_item_id');
            $table->unsignedInteger('minute_id');
            $table->string('task_description', 500);
            $table->unsignedInteger('responsible_officer_id')->nullable();
            $table->date('deadline')->nullable();
            $table->enum('status', ['pending', 'in_progress', 'completed'])->default('pending');
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('minute_id')->references('minute_id')->on('meeting_minutes')->onDelete('cascade');
            $table->foreign('responsible_officer_id')->references('user_id')->on('users');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('action_items');
    }
};
