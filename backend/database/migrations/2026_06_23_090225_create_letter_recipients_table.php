<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('letter_recipients', function (Blueprint $table) {
            $table->id('letter_recipient_id');
            $table->unsignedInteger('letter_id');
            $table->unsignedBigInteger('organization_id')->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('recipient_label', 255)->nullable();

            $table->foreign('letter_id')->references('letter_id')->on('letters')->onDelete('cascade');
            $table->foreign('organization_id')->references('organization_id')->on('organizations')->nullOnDelete();
            $table->foreign('user_id')->references('user_id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('letter_recipients');
    }
};
