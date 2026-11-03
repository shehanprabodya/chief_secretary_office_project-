<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Letter;
use App\Models\MeetingMinute;
use App\Models\SigningDelegation;
use App\Models\User;
use App\Models\UserSignature;
use App\Services\SignatureManagementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class SignatureManagementController extends Controller
{
    public function __construct(
        protected readonly SignatureManagementService $signatureService,
    ) {}

    public function storeSignature(Request $request): JsonResponse
    {
        if (!$request->user()?->hasRole('admin')) {
            return response()->json(['message' => 'Only administrators may upload official signatures.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'user_id' => ['required', 'exists:users,user_id'],
            'signature' => ['required', 'file', 'image', 'mimes:png,jpg,jpeg,webp'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        try {
            $user = User::query()->with('role')->findOrFail($request->input('user_id'));
            $allowedRoles = ['chief_secretary', 'deputy'];

            if (!in_array($user->role?->role_name, $allowedRoles, true)) {
                return response()->json([
                    'message' => 'Only the Chief Secretary and Deputy Chief Secretary may have official signatures uploaded.',
                ], 422);
            }

            $record = $this->signatureService->uploadSignature(
                $user,
                $request->file('signature'),
                (bool) ($request->boolean('is_active', true)),
                $request->user(),
            );

            return response()->json([
                'message' => 'Signature uploaded successfully.',
                'signature' => $record,
            ], 201);
        } catch (ValidationException $exception) {
            return response()->json([
                'message' => 'Invalid signature upload.',
                'errors' => $exception->errors(),
            ], 422);
        }
    }

    public function index(Request $request): JsonResponse
    {
        if (!$request->user()?->hasRole('admin')) {
            return response()->json(['message' => 'Only administrators can view uploaded signatures.'], 403);
        }

        $records = $this->signatureService->listUploadedSignatures();

        return response()->json([
            'data' => $records->map(function ($record) {
                return [
                    'id' => $record->id,
                    'user_id' => $record->user_id,
                    'user_name' => $record->user?->full_name,
                    'role_name' => $record->user?->role?->role_name,
                    'mime_type' => $record->mime_type,
                    'file_size' => $record->file_size,
                    'is_active' => (bool) $record->is_active,
                    'uploaded_at' => $record->uploaded_at?->toISOString(),
                    'uploaded_by_name' => $record->uploadedBy?->full_name,
                    'preview_data_uri' => $record->preview_data_uri,
                ];
            })->values(),
        ]);
    }

    public function destroy(Request $request, int $signatureId): JsonResponse
    {
        if (!$request->user()?->hasRole('admin')) {
            return response()->json(['message' => 'Only administrators can delete uploaded signatures.'], 403);
        }

        $signature = UserSignature::query()->findOrFail($signatureId);
        $this->signatureService->deleteSignature($signature);

        return response()->json([
            'message' => 'Signature deleted successfully.',
        ]);
    }

    public function storeDelegation(Request $request): JsonResponse
    {
        if (!$request->user()?->hasRole('chief_secretary')) {
            return response()->json(['message' => 'Only the Chief Secretary may authorize signing delegations.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'delegated_signer_id' => ['required', 'exists:users,user_id'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $delegatedSignerId = (int) $request->input('delegated_signer_id');
        $delegatedSigner = User::query()->findOrFail($delegatedSignerId);

        if ($delegatedSigner->hasRole('chief_secretary')) {
            return response()->json(['message' => 'The Chief Secretary cannot delegate to themselves.'], 422);
        }

        $delegation = SigningDelegation::query()->create([
            'primary_signer_id' => $request->user()->user_id,
            'delegated_signer_id' => $delegatedSigner->user_id,
            'authorized_by' => $request->user()->user_id,
            'reason' => $request->input('reason'),
            'start_date' => $request->input('start_date'),
            'end_date' => $request->input('end_date'),
            'status' => 'active',
            'authorized_at' => now(),
        ]);

        return response()->json([
            'message' => 'Signing delegation created successfully.',
            'delegation' => $delegation,
        ], 201);
    }

    public function signDocument(Request $request, string $documentType, int $documentId): JsonResponse
    {
        $request->validate([
            'confirm' => ['required', 'accepted'],
            'password' => ['required', 'string'],
        ]);

        try {
            $documentSignature = $this->signatureService->signDocument(
                $request->user(),
                $documentType,
                $documentId,
                (bool) $request->boolean('confirm', false),
                (string) $request->input('password', ''),
            );

            return response()->json([
                'message' => 'Document signed successfully.',
                'document_signature' => $documentSignature,
            ], 200);
        } catch (ValidationException $exception) {
            return response()->json([
                'message' => 'Document signing failed.',
                'errors' => $exception->errors(),
            ], 422);
        }
    }
}
