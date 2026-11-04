<?php

namespace App\Console\Commands;

use App\Services\BackupService;
use App\Services\SecurityAuditService;
use Illuminate\Console\Command;

class RunScheduledBackupCommand extends Command
{
    protected $signature = 'app:backup:run {--type=full : Backup type (database|files|full)}';

    protected $description = 'Create a scheduled encrypted backup archive.';

    public function __construct(
        private readonly BackupService $backupService,
        private readonly SecurityAuditService $securityAuditService,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $type = (string) $this->option('type');

        $backup = $this->backupService->createBackup(
            type: $type,
            createdBy: null,
            metadata: ['trigger' => 'scheduled']
        );

        $this->securityAuditService->log(
            eventType: 'backup.created.scheduled',
            severity: 'warning',
            metadata: ['backup_id' => $backup->backup_id, 'type' => $backup->type]
        );

        $this->info('Backup created: #'.$backup->backup_id);

        return self::SUCCESS;
    }
}
