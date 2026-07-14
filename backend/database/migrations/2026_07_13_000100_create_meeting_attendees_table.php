<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meeting_attendees', function (Blueprint $table) {
            $table->unsignedInteger('meeting_id');
            $table->unsignedBigInteger('user_id');
            $table->enum('attendance_role', ['assigned', 'observer'])->default('assigned');

            $table->primary(['meeting_id', 'user_id']);
            $table->foreign('meeting_id')->references('meeting_id')->on('meetings')->cascadeOnDelete();
            $table->foreign('user_id')->references('user_id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meeting_attendees');
    }
};
