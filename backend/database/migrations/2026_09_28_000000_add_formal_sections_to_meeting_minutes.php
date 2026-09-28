<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('meeting_minutes', function (Blueprint $table) {
            $table->longText('closing_remarks')->nullable();
            $table->string('signatory_name')->nullable();
            $table->string('signatory_designation')->nullable();
        });

        Schema::table('minute_decisions', function (Blueprint $table) {
            $table->string('topic', 500)->nullable();
            $table->text('responsibility')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('minute_decisions', function (Blueprint $table) {
            $table->dropColumn(['topic', 'responsibility']);
        });

        Schema::table('meeting_minutes', function (Blueprint $table) {
            $table->dropColumn(['closing_remarks', 'signatory_name', 'signatory_designation']);
        });
    }
};
