<?php

namespace App\Console\Commands;

use App\Services\BackupService;
use Illuminate\Console\Command;

class PruneBackupsCommand extends Command
{
    protected $signature = 'app:backup:prune';

    protected $description = 'Delete expired backup archives according to retention policy.';

    public function __construct(private readonly BackupService $backupService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $count = $this->backupService->pruneExpiredBackups();
        $this->info('Pruned backups: '.$count);

        return self::SUCCESS;
    }
}
