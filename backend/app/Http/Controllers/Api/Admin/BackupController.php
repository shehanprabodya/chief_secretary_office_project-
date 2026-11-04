<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\BackupArchive;
use App\Models\User;
use App\Services\BackupService;
use App\Services\SecurityAuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class BackupController extends Controller
{
    public function __construct(
        private readonly BackupService $backupService,
        private readonly SecurityAuditService $securityAuditService,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $items = BackupArchive::query()
            ->latest('created_at')
            ->paginate($request->integer('per_page', 15));

        return response()->json($items);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'nullable|in:database,files,full',
            'retention_days' => 'nullable|integer|min:1|max:365',
        ]);

        /** @var User $admin */
        $admin = $request->user();

        try {
            $backup = $this->backupService->createBackup(
                type: (string) ($validated['type'] ?? 'full'),
                createdBy: $admin->user_id,
                retentionDays: isset($validated['retention_days']) ? (int) $validated['retention_days'] : null,
                metadata: ['trigger' => 'manual']
            );
        } catch (\RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        $this->securityAuditService->log(
            eventType: 'backup.created.manual',
            actor: $admin,
            target: $admin,
            request: $request,
            severity: 'warning',
            metadata: ['backup_id' => $backup->backup_id, 'type' => $backup->type]
        );

        return response()->json([
            'message' => 'Backup created successfully.',
            'backup' => $backup,
        ], 201);
    }

    public function download(Request $request, int $backupId)
    {
        $backup = BackupArchive::findOrFail($backupId);
        $disk = Storage::disk($backup->storage_disk);

        abort_unless($disk->exists($backup->storage_path), 404, 'Backup file not found.');

        $this->securityAuditService->log(
            eventType: 'backup.downloaded',
            actor: $request->user(),
            target: $request->user(),
            request: $request,
            severity: 'warning',
            metadata: ['backup_id' => $backup->backup_id]
        );

        return response()->streamDownload(
            static function () use ($disk, $backup): void {
                echo $disk->get($backup->storage_path);
            },
            basename($backup->storage_path),
            ['Content-Type' => 'application/octet-stream']
        );
    }

    public function destroy(Request $request, int $backupId): JsonResponse
    {
        $backup = BackupArchive::findOrFail($backupId);

        $this->backupService->deleteBackup($backup);

        $this->securityAuditService->log(
            eventType: 'backup.deleted',
            actor: $request->user(),
            target: $request->user(),
            request: $request,
            severity: 'warning',
            metadata: ['backup_id' => $backup->backup_id]
        );

        return response()->json(['message' => 'Backup deleted successfully.']);
    }

    public function restore(Request $request, int $backupId): JsonResponse
    {
        $validated = $request->validate([
            'confirmation' => 'required|in:RESTORE',
            'password' => 'required|string',
        ]);

        /** @var User $admin */
        $admin = $request->user();
        if (!Hash::check((string) $validated['password'], $admin->password_hash)) {
            return response()->json(['message' => 'Administrator authentication failed.'], 422);
        }

        $backup = BackupArchive::findOrFail($backupId);

        try {
            $safetyBackup = $this->backupService->createBackup(
                type: 'full',
                createdBy: $admin->user_id,
                metadata: [
                    'trigger' => 'pre_restore_safety',
                    'target_backup_id' => $backup->backup_id,
                ]
            );

            $this->backupService->restoreBackup($backup);
        } catch (\RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        $this->securityAuditService->log(
            eventType: 'backup.restored',
            actor: $admin,
            target: $admin,
            request: $request,
            severity: 'critical',
            metadata: [
                'backup_id' => $backup->backup_id,
                'safety_backup_id' => $safetyBackup->backup_id,
            ]
        );

        return response()->json([
            'message' => 'Backup restored successfully.',
            'safety_backup_id' => $safetyBackup->backup_id,
        ]);
    }
}
