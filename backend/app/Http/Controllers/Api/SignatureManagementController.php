<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApprovableDocument;
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

            $autoApproved = $this->attemptDeputyAutoApproval(
                $request,
                $documentType,
                (int) $documentSignature->document_id,
                (int) ($documentSignature->getAttribute('approval_document_id') ?? 0),
            );

            return response()->json([
                'message' => $autoApproved
                    ? 'නියෝජ්‍ය ප්‍රධාන ලේකම් විසින් ප්‍රධාන ලේකම් වෙනුවෙන් ලේඛනය අත්සන් කර සාර්ථකව අනුමත කරන ලදී.'
                    : 'Document signed successfully.',
                'auto_approved' => $autoApproved,
                'document_signature' => $documentSignature,
            ], 200);
        } catch (ValidationException $exception) {
            return response()->json([
                'message' => 'Document signing failed.',
                'errors' => $exception->errors(),
            ], 422);
        }
    }

    private function attemptDeputyAutoApproval(Request $request, string $documentType, int $sourceDocumentId, int $approvalDocumentId = 0): bool
    {
        if (!$request->user()?->hasRole('deputy')) {
            return false;
        }

        $approvalDocument = $approvalDocumentId > 0
            ? ApprovableDocument::query()->whereKey($approvalDocumentId)->first()
            : null;

        if (!$approvalDocument) {
            $approvalDocument = ApprovableDocument::query()
                ->where('document_type', $documentType)
                ->where('source_id', $sourceDocumentId)
                ->where('status', 'pending')
                ->where('current_step_order', 3)
                ->whereHas('steps', function ($query) use ($request) {
                    $query->where('step_order', 3)
                        ->where('required_role', 'deputy')
                        ->where('status', 'pending')
                        ->where(function ($assignment) use ($request) {
                            $assignment->whereNull('assigned_to')
                                ->orWhere('assigned_to', $request->user()->user_id);
                        });
                })
                ->latest('document_id')
                ->first();
        }

        if (!$approvalDocument) {
            return false;
        }

        $approveRequest = Request::create('/api/approvals/' . $approvalDocument->document_id . '/approve', 'POST', [
            'notes' => 'Auto-approved after delegated deputy signing.',
        ]);
        $approveRequest->setUserResolver(fn () => $request->user());

        app(ApprovalController::class)->approve($approveRequest, (int) $approvalDocument->document_id);

        return true;
    }
}
