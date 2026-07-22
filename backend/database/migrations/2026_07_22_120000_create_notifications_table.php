<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->bigIncrements('notification_id');
            $table->unsignedBigInteger('user_id');
            $table->string('type', 80);
            $table->string('title', 160);
            $table->text('message');
            $table->string('action_url')->nullable();
            $table->string('entity_type', 80)->nullable();
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->enum('priority', ['normal', 'important', 'urgent'])->default('normal');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('user_id')->on('users')->cascadeOnDelete();
            $table->index(['user_id', 'read_at', 'created_at']);
            $table->index(['entity_type', 'entity_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
