<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('approval_steps', function (Blueprint $table) {
            $table->increments('step_id');
            $table->unsignedInteger('letter_id');
            $table->string('step_name', 100); // 'Draft Created', 'Chief Secretary Review', 'Official Seal & Dispatch'
            $table->unsignedTinyInteger('step_order'); // 1, 2, 3
            $table->enum('status', ['pending', 'current', 'completed', 'rejected'])->default('pending');
            $table->unsignedInteger('actioned_by')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('actioned_at')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('letter_id')->references('letter_id')->on('letters')->onDelete('cascade');
            $table->foreign('actioned_by')->references('user_id')->on('users');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('approval_steps');
    }
};
