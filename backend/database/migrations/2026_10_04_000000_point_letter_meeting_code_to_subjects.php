<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
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
        Schema::table('letters', function (Blueprint $table) {
            $table->dropForeign('letters_meeting_code_foreign');
            $table->foreign('meeting_code')
                ->references('meeting_code')
                ->on('meetings')
                ->nullOnDelete();
        });
    }
};
