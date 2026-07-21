<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_records', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable()->change();
            $table->unsignedBigInteger('letter_recipient_id')->nullable()->after('letter_id');
            $table->foreign('letter_recipient_id')
                ->references('letter_recipient_id')
                ->on('letter_recipients')
                ->nullOnDelete();
            $table->unique(['letter_id', 'letter_recipient_id']);
        });
    }

    public function down(): void
    {
        Schema::table('attendance_records', function (Blueprint $table) {
            $table->dropUnique(['letter_id', 'letter_recipient_id']);
            $table->dropForeign(['letter_recipient_id']);
            $table->dropColumn('letter_recipient_id');
        });
    }
};
