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
            Schema::create('approval_comments', function (Blueprint $table) {
            $table->increments('comment_id');
            $table->unsignedInteger('document_id');
            $table->unsignedInteger('user_id');
            $table->text('comment');
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('document_id')->references('document_id')->on('approvable_documents')->onDelete('cascade');
            $table->foreign('user_id')->references('user_id')->on('users');
        }); 
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('approval_comments');
    }
};
