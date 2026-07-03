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
        Schema::create('letter_recipients', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('letter_id');
            $table->unsignedBigInteger('organization_id'); // FK -> organizations table
            $table->string('designation', 150);
            $table->text('organization_address')->nullable(); // optional override if org has no address or needs a custom one
            $table->timestamps();

            $table->foreign('letter_id')->references('letter_id')->on('letters')->onDelete('cascade');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('restrict');
            $table->unique(['letter_id','organization_id','designation','organization_address'], 'letter_recipient_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('letter_recipients');
    }
};
