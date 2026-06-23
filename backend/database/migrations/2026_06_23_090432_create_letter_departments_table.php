<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('letter_departments', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('letter_id');
            $table->unsignedBigInteger('department_id');

            $table->foreign('letter_id')->references('letter_id')->on('letters')->onDelete('cascade');
            $table->foreign('department_id')->references('department_id')->on('departments')->onDelete('cascade');
            $table->unique(['letter_id', 'department_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('letter_departments');
    }
};
