<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('attendance_records', 'letter_id')) {
            Schema::table('attendance_records', function (Blueprint $table) {
                $table->unsignedInteger('letter_id')->nullable()->after('meeting_id');
                $table->foreign('letter_id')->references('letter_id')->on('letters')->nullOnDelete();
            });
        }

        DB::table('attendance_records')->orderBy('attendance_id')->each(function ($record) {
            $letterId = DB::table('letters')
                ->where('meeting_id', $record->meeting_id)
                ->where('status', 'approved')
                ->orderByDesc('letter_id')
                ->value('letter_id');

            if ($letterId) {
                DB::table('attendance_records')
                    ->where('attendance_id', $record->attendance_id)
                    ->update(['letter_id' => $letterId]);
            }
        });

        Schema::table('attendance_records', function (Blueprint $table) {
            // The meeting foreign key needs a standalone index before its old
            // composite unique index can be replaced on MySQL.
            $table->index('meeting_id');
            $table->dropUnique(['meeting_id', 'user_id']);
            $table->unique(['letter_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::table('attendance_records', function (Blueprint $table) {
            $table->dropUnique(['letter_id', 'user_id']);
            $table->dropForeign(['letter_id']);
            $table->dropColumn('letter_id');
            $table->unique(['meeting_id', 'user_id']);
        });
    }
};
