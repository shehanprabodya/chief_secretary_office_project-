<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_records', function (Blueprint $table) {
            $table->unsignedBigInteger('additional_attendee_id')
                ->nullable()
                ->after('letter_recipient_id');

            $table->foreign('additional_attendee_id')
                ->references('additional_attendee_id')
                ->on('additional_attendees')
                ->cascadeOnDelete();

            $table->unique(['letter_id', 'additional_attendee_id']);
        });
    }

    public function down(): void
    {
        Schema::table('attendance_records', function (Blueprint $table) {
            $table->dropUnique(['letter_id', 'additional_attendee_id']);
            $table->dropForeign(['additional_attendee_id']);
            $table->dropColumn('additional_attendee_id');
        });
    }
};
