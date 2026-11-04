<?php

namespace App\Services;

use App\Models\BackupArchive;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use ZipArchive;

class BackupService
{
    public function createBackup(string $type = 'full', ?int $createdBy = null, ?int $retentionDays = null, array $metadata = []): BackupArchive
    {
        $type = in_array($type, ['database', 'files', 'full'], true) ? $type : 'full';
        $tmpDir = storage_path('app/tmp/backups/'.Str::uuid()->toString());
        File::ensureDirectoryExists($tmpDir);

        $zipPath = $tmpDir.'/archive.zip';
        $zip = new ZipArchive();

        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException('Unable to create backup archive.');
        }

        $manifest = ['paths' => []];

        if (in_array($type, ['database', 'full'], true)) {
            $sql = $this->exportDatabaseSql();
            $zip->addFromString('database/database.sql', $sql);
        }

        if (in_array($type, ['files', 'full'], true)) {
            $includePaths = config('backup.include_paths', []);
            foreach ($includePaths as $index => $relativePath) {
                $sourcePath = base_path($relativePath);
                if (!is_dir($sourcePath)) {
                    continue;
                }

                $folderKey = 'path_'.$index;
                $manifest['paths'][$folderKey] = $relativePath;
                $this->addDirectoryToZip($zip, $sourcePath, 'files/'.$folderKey);
            }
        }

        $zip->addFromString('manifest.json', json_encode($manifest, JSON_UNESCAPED_SLASHES));
        $zip->close();

        $zipPayload = File::get($zipPath);
        $encrypted = $this->encryptPayload($zipPayload);

        $fileName = 'backup-'.now()->format('Ymd-His').'-'.Str::random(8).'.enc';
        $storagePath = now()->format('Y/m/d').'/'.$fileName;
        $disk = (string) config('backup.local_disk', 'backups');

        Storage::disk($disk)->put($storagePath, json_encode($encrypted, JSON_UNESCAPED_SLASHES));

        if ((bool) config('backup.offsite_enabled', false)) {
            $offsiteDisk = (string) config('backup.offsite_disk', 'backups_offsite');
            Storage::disk($offsiteDisk)->put($storagePath, json_encode($encrypted, JSON_UNESCAPED_SLASHES));
            $metadata['offsite_disk'] = $offsiteDisk;
            $metadata['offsite_path'] = $storagePath;
        }

        File::deleteDirectory($tmpDir);

        $retention = $retentionDays ?? (int) config('backup.retention_days', 14);

        return BackupArchive::create([
            'type' => $type,
            'storage_disk' => $disk,
            'storage_path' => $storagePath,
            'size_bytes' => strlen(json_encode($encrypted, JSON_UNESCAPED_SLASHES)),
            'sha256_checksum' => $encrypted['sha256'],
            'retention_until' => now()->addDays(max(1, $retention)),
            'created_by' => $createdBy,
            'status' => 'available',
            'metadata' => $metadata,
        ]);
    }

    public function restoreBackup(BackupArchive $backup): void
    {
        if ($backup->status !== 'available') {
            throw new RuntimeException('Backup is not available for restoration.');
        }

        $disk = Storage::disk($backup->storage_disk);
        if (!$disk->exists($backup->storage_path)) {
            throw new RuntimeException('Backup file not found.');
        }

        $raw = (string) $disk->get($backup->storage_path);
        $envelope = json_decode($raw, true);

        if (!is_array($envelope)) {
            throw new RuntimeException('Backup file format is invalid.');
        }

        $zipPayload = $this->decryptPayload($envelope, $backup->sha256_checksum);

        $tmpDir = storage_path('app/tmp/restore/'.Str::uuid()->toString());
        File::ensureDirectoryExists($tmpDir);

        $zipPath = $tmpDir.'/archive.zip';
        File::put($zipPath, $zipPayload);

        $zip = new ZipArchive();
        if ($zip->open($zipPath) !== true) {
            File::deleteDirectory($tmpDir);
            throw new RuntimeException('Unable to open backup archive for restore.');
        }

        $extractDir = $tmpDir.'/extract';
        File::ensureDirectoryExists($extractDir);
        $zip->extractTo($extractDir);
        $zip->close();

        $sqlPath = $extractDir.'/database/database.sql';
        if (File::exists($sqlPath)) {
            $sql = File::get($sqlPath);
            DB::unprepared($sql);
        }

        $manifestPath = $extractDir.'/manifest.json';
        if (File::exists($manifestPath)) {
            $manifest = json_decode((string) File::get($manifestPath), true);
            $paths = $manifest['paths'] ?? [];
            foreach ($paths as $folderKey => $relativePath) {
                $sourcePath = $extractDir.'/files/'.$folderKey;
                $targetPath = base_path((string) $relativePath);
                if (!is_dir($sourcePath)) {
                    continue;
                }
                File::ensureDirectoryExists($targetPath);
                File::copyDirectory($sourcePath, $targetPath);
            }
        }

        $backup->update([
            'status' => 'restored',
            'restored_at' => now(),
        ]);

        File::deleteDirectory($tmpDir);
    }

    public function deleteBackup(BackupArchive $backup): void
    {
        Storage::disk($backup->storage_disk)->delete($backup->storage_path);

        if (!empty($backup->metadata['offsite_disk'] ?? null) && !empty($backup->metadata['offsite_path'] ?? null)) {
            Storage::disk($backup->metadata['offsite_disk'])->delete($backup->metadata['offsite_path']);
        }

        $backup->update(['status' => 'deleted']);
    }

    public function pruneExpiredBackups(): int
    {
        $count = 0;
        BackupArchive::query()
            ->where('status', 'available')
            ->whereNotNull('retention_until')
            ->where('retention_until', '<=', now())
            ->chunkById(100, function ($items) use (&$count) {
                foreach ($items as $backup) {
                    $this->deleteBackup($backup);
                    $count++;
                }
            }, 'backup_id');

        return $count;
    }

    private function exportDatabaseSql(): string
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'sqlite') {
            $path = config('database.connections.sqlite.database');
            if (is_string($path) && file_exists($path)) {
                return '-- SQLite file backup (binary data is not embedded)'.PHP_EOL;
            }

            return '-- SQLite in-memory backup metadata'.PHP_EOL;
        }

        if ($driver !== 'mysql') {
            throw new RuntimeException('Only mysql/sqlite database backups are currently supported.');
        }

        $tables = DB::select('SHOW TABLES');
        $sql = [];

        foreach ($tables as $tableRow) {
            $table = array_values((array) $tableRow)[0] ?? null;
            if (!is_string($table)) {
                continue;
            }

            $createStmt = DB::select("SHOW CREATE TABLE `{$table}`");
            if (!empty($createStmt)) {
                $row = (array) $createStmt[0];
                $sql[] = 'DROP TABLE IF EXISTS `'.$table.'`;';
                $sql[] = (string) ($row['Create Table'] ?? end($row)).';';
            }

            $rows = DB::table($table)->get();
            foreach ($rows as $record) {
                $values = array_map(function ($value) {
                    if ($value === null) {
                        return 'NULL';
                    }

                    return "'".str_replace("'", "''", (string) $value)."'";
                }, (array) $record);

                $columns = array_map(static fn ($col) => '`'.$col.'`', array_keys((array) $record));
                $sql[] = 'INSERT INTO `'.$table.'` ('.implode(', ', $columns).') VALUES ('.implode(', ', $values).');';
            }
        }

        return implode(PHP_EOL, $sql).PHP_EOL;
    }

    private function addDirectoryToZip(ZipArchive $zip, string $sourcePath, string $zipPrefix): void
    {
        $files = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($sourcePath, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::SELF_FIRST
        );

        foreach ($files as $file) {
            $pathName = $file->getPathname();
            $relativePath = ltrim(str_replace($sourcePath, '', $pathName), DIRECTORY_SEPARATOR);
            $zipPath = $zipPrefix.'/'.$relativePath;

            if ($file->isDir()) {
                $zip->addEmptyDir($zipPath);
            } else {
                $zip->addFile($pathName, $zipPath);
            }
        }
    }

    private function encryptPayload(string $plain): array
    {
        $key = $this->resolveEncryptionKey();
        $iv = random_bytes(12);
        $tag = '';

        $ciphertext = openssl_encrypt($plain, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);

        if ($ciphertext === false) {
            throw new RuntimeException('Backup encryption failed.');
        }

        return [
            'v' => 1,
            'alg' => 'AES-256-GCM',
            'iv' => base64_encode($iv),
            'tag' => base64_encode($tag),
            'ciphertext' => base64_encode($ciphertext),
            'sha256' => hash('sha256', $ciphertext),
        ];
    }

    private function decryptPayload(array $envelope, string $expectedSha256): string
    {
        $ciphertext = base64_decode((string) ($envelope['ciphertext'] ?? ''), true);
        $iv = base64_decode((string) ($envelope['iv'] ?? ''), true);
        $tag = base64_decode((string) ($envelope['tag'] ?? ''), true);

        if ($ciphertext === false || $iv === false || $tag === false) {
            throw new RuntimeException('Backup integrity validation failed.');
        }

        $actualSha = hash('sha256', $ciphertext);
        if (!hash_equals($expectedSha256, $actualSha)) {
            throw new RuntimeException('Backup integrity verification failed (SHA-256 mismatch).');
        }

        $decrypted = openssl_decrypt($ciphertext, 'aes-256-gcm', $this->resolveEncryptionKey(), OPENSSL_RAW_DATA, $iv, $tag);

        if ($decrypted === false) {
            throw new RuntimeException('Backup decryption failed.');
        }

        return $decrypted;
    }

    private function resolveEncryptionKey(): string
    {
        $configured = (string) config('backup.encryption_key', '');

        if ($configured === '') {
            $configured = (string) config('app.key', '');
        }

        if ($configured === '') {
            throw new RuntimeException('BACKUP_ENCRYPTION_KEY is not configured.');
        }

        $candidate = str_starts_with($configured, 'base64:')
            ? base64_decode(substr($configured, 7), true)
            : $configured;

        if (!is_string($candidate) || $candidate === '') {
            throw new RuntimeException('BACKUP_ENCRYPTION_KEY is invalid.');
        }

        if (strlen($candidate) !== 32) {
            $candidate = hash('sha256', $candidate, true);
        }

        return $candidate;
    }
}
