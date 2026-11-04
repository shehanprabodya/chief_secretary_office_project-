<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'full_name_si')) {
                $table->string('full_name_si', 255)->nullable()->after('full_name');
            }

            if (!Schema::hasColumn('users', 'designation_si')) {
                $table->string('designation_si', 255)->nullable()->after('designation');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'designation_si')) {
                $table->dropColumn('designation_si');
            }

            if (Schema::hasColumn('users', 'full_name_si')) {
                $table->dropColumn('full_name_si');
            }
        });
    }
};
