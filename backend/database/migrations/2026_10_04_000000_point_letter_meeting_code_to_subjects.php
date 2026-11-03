<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() === 'sqlite') {
            return;
        }

        Schema::table('letters', function (Blueprint $table) {
            $table->dropForeign('letters_meeting_code_foreign');
            $table->foreign('meeting_code')
                ->references('code')
                ->on('subjects')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() === 'sqlite') {
            return;
        }

        Schema::table('letters', function (Blueprint $table) {
            $table->dropForeign('letters_meeting_code_foreign');
            $table->foreign('meeting_code')
                ->references('meeting_code')
                ->on('meetings')
                ->nullOnDelete();
        });
    }
};
