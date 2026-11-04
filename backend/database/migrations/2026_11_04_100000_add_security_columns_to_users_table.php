<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('preferred_locale', 5)->default('en')->after('status');
            $table->boolean('invitation_pending')->default(false)->after('preferred_locale');
            $table->timestamp('invited_at')->nullable()->after('invitation_pending');
            $table->timestamp('password_changed_at')->nullable()->after('invited_at');
            $table->timestamp('last_login_at')->nullable()->after('password_changed_at');

            $table->index('preferred_locale');
            $table->index('invitation_pending');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['preferred_locale']);
            $table->dropIndex(['invitation_pending']);
            $table->dropColumn([
                'preferred_locale',
                'invitation_pending',
                'invited_at',
                'password_changed_at',
                'last_login_at',
            ]);
        });
    }
};
