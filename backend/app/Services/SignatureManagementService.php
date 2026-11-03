<?php

namespace App\Services;

use App\Models\DocumentSignature;
use App\Models\Letter;
use App\Models\MeetingMinute;
use App\Models\SigningDelegation;
use App\Models\User;
use App\Models\UserSignature;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

class SignatureManagementService
{
    public function uploadSignature(User $user, UploadedFile $file, bool $isActive = true, ?User $uploadedBy = null): UserSignature
    {
        $allowedMimeTypes = ['image/png', 'image/jpeg', 'image/webp'];
        $mimeType = $file->getMimeType();

        if (!in_array($mimeType, $allowedMimeTypes, true)) {
            throw ValidationException::withMessages([
                'signature' => ['Only PNG, JPEG, and WebP signature images are allowed.'],
            ]);
        }

        $contents = file_get_contents($file->getRealPath());
        if ($contents === false || $contents === '') {
            throw ValidationException::withMessages([
                'signature' => ['The signature file could not be read.'],
            ]);
        }

        $directory = 'private/signatures/' . $user->user_id;
        $filename = 'signature-' . time() . '-' . bin2hex(random_bytes(6)) . '.' . $this->extensionFromMime($mimeType);
        $path = $directory . '/' . $filename;

        $fullPath = storage_path('app/' . ltrim($path, '/'));
        $directoryPath = dirname($fullPath);
        if (!is_dir($directoryPath)) {
            mkdir($directoryPath, 0775, true);
        }

        file_put_contents($fullPath, encrypt($contents), LOCK_EX);

        if ($isActive) {
            UserSignature::query()
                ->where('user_id', $user->user_id)
                ->where('is_active', true)
                ->update([
                    'is_active' => false,
                    'deactivated_at' => now(),
                ]);
        }

        return UserSignature::query()->create([
            'user_id' => $user->user_id,
            'encrypted_file_path' => $path,
            'mime_type' => $mimeType,
            'file_size' => strlen($contents),
            'encryption_version' => 'v1',
            'is_active' => $isActive,
            'uploaded_by' => $uploadedBy?->user_id,
            'uploaded_at' => now(),
        ]);
    }

    public function activeSignatureForUser(User $user): ?UserSignature
    {
        return UserSignature::query()
            ->where('user_id', $user->user_id)
            ->where('is_active', true)
            ->orderByDesc('uploaded_at')
            ->first();
    }

    public function activeDelegationFor(User $user): ?SigningDelegation
    {
        $today = now()->toDateString();

        return SigningDelegation::query()
            ->where('delegated_signer_id', $user->user_id)
            ->where('status', 'active')
            ->whereDate('start_date', '<=', $today)
            ->whereDate('end_date', '>=', $today)
            ->orderByDesc('authorized_at')
            ->first();
    }

    public function dataUriForUser(User $user): ?string
    {
        $signature = $this->activeSignatureForUser($user);
        if (!$signature) {
            return null;
        }

        return $this->dataUriForSignature($signature);
    }

    public function dataUriForSignature(UserSignature $signature): ?string
    {
        $fullPath = storage_path('app/' . ltrim($signature->encrypted_file_path, '/'));
        if (!is_file($fullPath) || !is_readable($fullPath)) {
            return null;
        }

        $contents = file_get_contents($fullPath);
        if ($contents === false) {
            return null;
        }

        $decrypted = decrypt($contents);

        return 'data:' . $signature->mime_type . ';base64,' . base64_encode($decrypted);
    }

    public function listUploadedSignatures(): \Illuminate\Support\Collection
    {
        return UserSignature::query()
            ->with(['user.role', 'uploadedBy.role'])
            ->orderByDesc('uploaded_at')
            ->get()
            ->map(function (UserSignature $signature) {
                $signature->preview_data_uri = $this->dataUriForSignature($signature);
                $signature->uploaded_by_name = $signature->uploadedBy?->full_name;
                $signature->user_name = $signature->user?->full_name;
                $signature->role_name = $signature->user?->role?->role_name;

                return $signature;
            });
    }

    public function deleteSignature(UserSignature $signature): bool
    {
        $fullPath = storage_path('app/' . ltrim($signature->encrypted_file_path, '/'));
        if (is_file($fullPath)) {
            @unlink($fullPath);
        }

        $directory = dirname($fullPath);
        if (is_dir($directory) && count(scandir($directory)) === 2) {
            @rmdir($directory);
        }

        return (bool) $signature->delete();
    }

    public function signDocument(User $actor, string $documentType, int $documentId, bool $confirm, string $password): DocumentSignature
    {
        if (!$confirm) {
            throw ValidationException::withMessages([
                'confirm' => ['Confirmation is required before signing this document.'],
            ]);
        }

        if (!password_verify($password, $actor->getAuthPassword())) {
            throw ValidationException::withMessages([
                'password' => ['The provided password is incorrect.'],
            ]);
        }

        $documentModel = match ($documentType) {
            'letter' => Letter::class,
            'minute' => MeetingMinute::class,
            default => null,
        };

        if (!$documentModel) {
            throw ValidationException::withMessages([
                'document_type' => ['Unsupported document type for signing.'],
            ]);
        }

        $resolvedDocumentId = $documentId;

        $approvableDocument = \App\Models\ApprovableDocument::query()
            ->where('document_type', $documentType)
            ->whereKey($documentId)
            ->first();

        if ($approvableDocument && !empty($approvableDocument->source_id)) {
            $resolvedDocumentId = (int) $approvableDocument->source_id;
        }

        $document = $documentModel::query()->findOrFail($resolvedDocumentId);

        $primarySigner = $actor;
        $delegation = null;
        $signingType = 'PRIMARY';

        if ($actor->hasRole('deputy')) {
            $delegation = $this->activeDelegationFor($actor);
            if (!$delegation) {
                throw ValidationException::withMessages([
                    'delegation' => ['No active delegation authorizes this deputy to sign.'],
                ]);
            }

            $primarySigner = User::query()->findOrFail($delegation->primary_signer_id);
            $signingType = 'DELEGATED';
        } elseif (!$actor->hasRole('chief_secretary')) {
            throw ValidationException::withMessages([
                'role' => ['Only the Chief Secretary or an authorized deputy may sign official documents.'],
            ]);
        }

        $signerImage = $this->activeSignatureForUser($actor);
        if (!$signerImage) {
            throw ValidationException::withMessages([
                'signature' => ['No active signature image is registered for this signatory.'],
            ]);
        }

        $documentReference = $documentType === 'letter'
            ? ($document->meeting_code ?? ('LETTER-' . $document->letter_id))
            : ($document->meeting_code ?? ('MINUTE-' . $document->minute_id));

        $documentHash = hash('sha256', $documentType . ':' . $resolvedDocumentId . ':' . ($document->updated_at?->toDateTimeString() ?? now()->toDateTimeString()));

        $documentSignature = DocumentSignature::query()->create([
            'document_type' => $documentType,
            'document_id' => $resolvedDocumentId,
            'signer_id' => $actor->user_id,
            'primary_signer_id' => $primarySigner->user_id,
            'signature_id' => $signerImage->id,
            'signing_type' => $signingType,
            'delegation_id' => $delegation?->id,
            'document_reference' => $documentReference,
            'document_hash' => $documentHash,
            'signed_at' => now(),
            'authentication_method' => 'password',
        ]);

        $documentSignature->load(['signature', 'delegation', 'signer', 'primarySigner']);

        return $documentSignature;
    }

    protected function extensionFromMime(string $mimeType): string
    {
        return match ($mimeType) {
            'image/png' => 'png',
            'image/jpeg' => 'jpg',
            'image/webp' => 'webp',
            default => 'png',
        };
    }
}
