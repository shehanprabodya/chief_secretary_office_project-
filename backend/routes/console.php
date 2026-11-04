<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use Laravel\Sanctum\PersonalAccessToken;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::call(function () {
    PersonalAccessToken::where('created_at', '<', now()->subMonth())->delete();
})
    ->name('purge-old-access-logs')
    ->dailyAt('01:00')
    ->withoutOverlapping();

Schedule::command('app:backup:run --type=full')
    ->name('scheduled-full-backup')
    ->dailyAt((string) config('backup.schedule', '03:00'))
    ->withoutOverlapping();

Schedule::command('app:backup:prune')
    ->name('prune-expired-backups')
    ->dailyAt('03:30')
    ->withoutOverlapping();
