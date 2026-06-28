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
        Schema::create('minute_decisions', function (Blueprint $table) {
            $table->increments('decision_id');
            $table->unsignedInteger('minute_id');
            $table->unsignedSmallInteger('decision_order');
            $table->text('decision_text');
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('minute_id')->references('minute_id')->on('meeting_minutes')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('minute_decisions');
    }
};
