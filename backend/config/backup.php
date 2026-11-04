<?php

return [
    'local_disk' => env('BACKUP_LOCAL_DISK', 'backups'),
    'offsite_disk' => env('BACKUP_OFFSITE_DISK', 's3'),
    'offsite_enabled' => (bool) env('BACKUP_OFFSITE_ENABLED', false),
    'retention_days' => (int) env('BACKUP_RETENTION_DAYS', 14),
    'schedule' => env('BACKUP_SCHEDULE', '03:00'),
    'encryption_key' => env('BACKUP_ENCRYPTION_KEY'),
    'include_paths' => array_filter(array_map('trim', explode(',', (string) env('BACKUP_INCLUDE_PATHS', 'storage/app/private,storage/app/public')))),
    'mysql_dump_binary' => env('MYSQLDUMP_BINARY', 'mysqldump'),
    'mysql_binary' => env('MYSQL_BINARY', 'mysql'),
];
