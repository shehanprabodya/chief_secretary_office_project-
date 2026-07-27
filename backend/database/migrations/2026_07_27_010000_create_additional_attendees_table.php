<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('additional_attendees', function (Blueprint $table) {
            $table->bigIncrements('additional_attendee_id');
            $table->unsignedInteger('meeting_id');
            $table->unsignedInteger('letter_id');
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('full_name', 255);
            $table->string('organization', 255);
            $table->string('designation', 150);
            $table->string('email', 255)->nullable();
            $table->text('addition_reason');
            $table->unsignedBigInteger('added_by');
            $table->timestamps();

            $table->foreign('meeting_id')
                ->references('meeting_id')
                ->on('meetings')
                ->cascadeOnDelete();
            $table->foreign('letter_id')
                ->references('letter_id')
                ->on('letters')
                ->cascadeOnDelete();
            $table->foreign('user_id')
                ->references('user_id')
                ->on('users')
                ->nullOnDelete();
            $table->foreign('added_by')
                ->references('user_id')
                ->on('users');

            $table->unique(['letter_id', 'user_id']);
            $table->index(['meeting_id', 'letter_id']);
            $table->index(['meeting_id', 'full_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('additional_attendees');
    }
};
