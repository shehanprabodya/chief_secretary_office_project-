<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meetings', function (Blueprint $table) {
            $table->increments('meeting_id');
            $table->string('reference_id', 50)->unique(); // e.g. SPC-MTG-2024-089
            $table->string('title', 255);
            $table->date('meeting_date');
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->string('location', 255)->nullable();
            $table->enum('location_type', ['physical', 'virtual', 'not_assigned'])->default('not_assigned');
            $table->unsignedBigInteger('department_id')->nullable();
            $table->enum('status', ['draft', 'scheduled', 'completed', 'cancelled'])->default('draft');
            $table->text('description')->nullable();
            $table->unsignedBigInteger('created_by'); // user_id of officer who created it
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();

            $table->foreign('department_id')->references('department_id')->on('departments');
            $table->foreign('created_by')->references('user_id')->on('users');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meetings');
    }
};