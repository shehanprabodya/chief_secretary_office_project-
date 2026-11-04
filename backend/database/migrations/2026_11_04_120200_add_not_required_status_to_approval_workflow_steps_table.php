<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement("ALTER TABLE approval_workflow_steps MODIFY COLUMN status ENUM('waiting','pending','approved','rejected','not_required') NOT NULL DEFAULT 'waiting'");
    }

    public function down(): void
    {
        DB::statement("UPDATE approval_workflow_steps SET status = 'waiting' WHERE status = 'not_required'");

        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement("ALTER TABLE approval_workflow_steps MODIFY COLUMN status ENUM('waiting','pending','approved','rejected') NOT NULL DEFAULT 'waiting'");
    }
};
