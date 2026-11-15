<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\Role;
use App\Models\User;
use App\Services\TemporaryCredentialService;
use App\Services\SecurityAuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Laravel\Sanctum\PersonalAccessToken;

class UserManagementController extends Controller
{
    public function __construct(
        private readonly TemporaryCredentialService $temporaryCredentialService,
        private readonly SecurityAuditService $securityAuditService,
    ) {
    }

    /**
     * Stats summary bar (Total Users / Admins / Departments / Inactive)
     */
    public function stats(): JsonResponse
    {
        return response()->json([
            'total_users' => User::count(),
            'admins' => User::whereHas('role', fn($q) => $q->where('role_name', 'admin'))->count(),
            'organizations' => Organization::count(),
            'inactive' => User::where('status', 'INACTIVE')->count(),
        ]);
    }

    /**
     * Paginated user list with search + filter
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::with('role', 'organization');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('full_name', 'like', "%{$s}%")
                  ->orWhere('email', 'like', "%{$s}%")
                  ->orWhere('username', 'like', "%{$s}%")
                  ->orWhereHas('role', fn($r) => $r->where('role_name', 'like', "%{$s}%"));
            });
        }

        if ($request->filled('role_id') && $request->role_id !== 'all') {
            $query->where('role_id', $request->role_id);
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $users = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return response()->json($users);
    }

    public function show(int $id): JsonResponse
    {
        $user = User::with('role', 'organization')->findOrFail($id);
        return response()->json(['user' => $user]);
    }

    /**
     * Create new user (Admin operation from "Add New User" button)
     */
    public function organizations(): JsonResponse
    {
        $organizations = Organization::where('status', 'ACTIVE')
            ->select('organization_id', 'organization_name')
            ->orderBy('organization_name')
            ->get();

        return response()->json([
            'organizations' => $organizations
        ]);
    }
    public function roles(): JsonResponse
       {
            $roles = Role::select('role_id', 'role_name')
            ->orderBy('role_name')
            ->get();

            return response()->json([
            'roles' => $roles
             ]);
        }

    public function organizationIndex(Request $request): JsonResponse
    {
        $search = trim((string) $request->input('search', ''));

        $query = Organization::query();

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('organization_name', 'like', "%{$search}%")
                    ->orWhere('abbreviation', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('telephone', 'like', "%{$search}%")
                    ->orWhere('address', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $organizations = $query
            ->orderBy('organization_name')
            ->paginate($request->integer('per_page', 10));

        return response()->json($organizations);
    }

    public function organizationStore(Request $request): JsonResponse
    {
        $data = $request->validate([
            'organization_name' => ['required', 'string', 'max:255', Rule::unique('organizations', 'organization_name')],
            'abbreviation' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:255'],
            'telephone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'status' => ['nullable', 'in:ACTIVE,INACTIVE'],
        ]);

        $organization = Organization::create([
            'organization_name' => trim($data['organization_name']),
            'abbreviation' => isset($data['abbreviation']) ? trim($data['abbreviation']) : null,
            'address' => isset($data['address']) ? trim($data['address']) : null,
            'telephone' => isset($data['telephone']) ? trim($data['telephone']) : null,
            'email' => isset($data['email']) ? trim($data['email']) : null,
            'status' => $data['status'] ?? 'ACTIVE',
        ]);

        return response()->json([
            'message' => 'Organization created successfully.',
            'organization' => $organization,
        ], 201);
    }

    public function organizationUpdate(Request $request, Organization $organization): JsonResponse
    {
        $data = $request->validate([
            'organization_name' => ['required', 'string', 'max:255', Rule::unique('organizations', 'organization_name')->ignore($organization->organization_id, 'organization_id')],
            'abbreviation' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:255'],
            'telephone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'status' => ['nullable', 'in:ACTIVE,INACTIVE'],
        ]);

        $organization->update([
            'organization_name' => trim($data['organization_name']),
            'abbreviation' => isset($data['abbreviation']) ? trim($data['abbreviation']) : null,
            'address' => isset($data['address']) ? trim($data['address']) : null,
            'telephone' => isset($data['telephone']) ? trim($data['telephone']) : null,
            'email' => isset($data['email']) ? trim($data['email']) : null,
            'status' => $data['status'] ?? $organization->status,
        ]);

        return response()->json([
            'message' => 'Organization updated successfully.',
            'organization' => $organization->fresh(),
        ]);
    }

    public function organizationDestroy(Organization $organization): JsonResponse
    {
        if ($organization->users()->exists()) {
            return response()->json([
                'message' => 'This organization cannot be deleted because users are assigned to it.',
            ], 409);
        }

        $organization->delete();

        return response()->json([
            'message' => 'Organization deleted successfully.',
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'full_name' => 'required|string|max:255',
            'full_name_si' => 'nullable|string|max:255',
            'email' => 'required|email|unique:users,email',
            'username' => 'required|string|max:100|unique:users,username',
            'role_id' => 'required|exists:roles,role_id',
            'organization_id' => 'nullable|exists:organizations,organization_id',
            'status' => 'nullable|in:ACTIVE,INACTIVE',
            'locale' => 'nullable|in:en,si',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $temporaryPassword = $this->temporaryCredentialService->generate();
        $user = DB::transaction(function () use ($request, $temporaryPassword) {
            $user = User::create([
                'full_name' => $request->full_name,
                'email' => $request->email,
                'username' => $request->username,
                'password_hash' => Hash::make($temporaryPassword),
                'designation' => $request->designation,
                'designation_si' => $request->designation_si,
                'full_name_si' => $request->full_name_si,
                'role_id' => $request->role_id,
                'organization_id' => $request->organization_id,
                'status' => $request->status ?? 'ACTIVE',
                'invitation_pending' => false,
                'must_change_password' => true,
                'invited_at' => null,
                'preferred_locale' => in_array((string) $request->input('locale'), ['en', 'si'], true)
                    ? (string) $request->input('locale')
                    : 'en',
            ]);

            $this->securityAuditService->log(
                eventType: 'admin.user.created',
                actor: $request->user(),
                target: $user,
                request: $request,
                metadata: ['temporary_credentials_generated' => true]
            );

            return $user;
        });

        $emailStatus = TemporaryCredentialService::EMAIL_STATUS_FAILED;
        try {
            $emailStatus = $this->temporaryCredentialService->deliver($user, $temporaryPassword, $user->preferred_locale ?? 'en');
        } catch (\Throwable) {
            $emailStatus = TemporaryCredentialService::EMAIL_STATUS_FAILED;
        }

        $message = $this->emailStatusMessage($emailStatus, true);

        return response()->json([
            'message' => $message,
            'email_status' => $emailStatus,
            'user' => $user->load('role', 'organization'),
        ], 201);
    }

    /**
     * Edit user details (pencil icon)
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'full_name' => 'sometimes|string|max:255',
            'full_name_si' => 'sometimes|nullable|string|max:255',
            'email' => "sometimes|email|unique:users,email,{$id},user_id",
            'username' => "sometimes|string|max:100|unique:users,username,{$id},user_id",
            'role_id' => 'sometimes|exists:roles,role_id',
            'designation'=>'nullable|string|max:150',
            'designation_si'=>'nullable|string|max:255',
            'organization_id' => 'nullable|exists:organizations,organization_id',
            'status' => 'sometimes|in:ACTIVE,INACTIVE',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user->update($validator->validated());

        return response()->json([
            'message' => 'User updated successfully',
            'user' => $user->load('role', 'organization'),
        ]);
    }

    /**
     * Reset password (rotate icon)
     */
    public function resetPassword(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'new_password' => ['nullable', 'confirmed', 'string', 'min:12', 'regex:/[a-z]/', 'regex:/[A-Z]/', 'regex:/[0-9]/', 'regex:/[^A-Za-z0-9]/'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        /** @var User $admin */
        $admin = $request->user();
        $target = User::findOrFail($id);

        $temporaryPassword = (string) $request->input('new_password');
        if ($temporaryPassword === '') $temporaryPassword = $this->temporaryCredentialService->generate();
        DB::transaction(function () use ($request, $target, $admin, $temporaryPassword) {
            $target->update(['password_hash' => Hash::make($temporaryPassword), 'password_changed_at' => null, 'must_change_password' => true, 'invitation_pending' => false]);
            $target->tokens()->delete();

            $this->securityAuditService->log(
                eventType: 'admin.user.password_reset',
                actor: $admin,
                target: $target,
                request: $request,
                severity: 'warning'
            );
        });

        $emailStatus = TemporaryCredentialService::EMAIL_STATUS_FAILED;
        try {
            $emailStatus = $this->temporaryCredentialService->deliver($target->fresh(), $temporaryPassword, $target->preferred_locale ?? 'en');
        } catch (\Throwable) {
            $emailStatus = TemporaryCredentialService::EMAIL_STATUS_FAILED;
        }

        return response()->json([
            'message' => $this->emailStatusMessage($emailStatus, false),
            'email_status' => $emailStatus,
        ], $emailStatus === TemporaryCredentialService::EMAIL_STATUS_FAILED ? 202 : 200);
    }

    public function resendCredentials(Request $request, int $id): JsonResponse
    {
        /** @var User $user */
        $user = User::findOrFail($id);
        /** @var User $admin */
        $admin = $request->user();
        $temporaryPassword = $this->temporaryCredentialService->generate();
        $locale = $user->preferred_locale ?? 'en';

        $previousState = [
            'password_hash' => $user->password_hash,
            'must_change_password' => (bool) $user->must_change_password,
            'password_changed_at' => $user->password_changed_at,
            'invitation_pending' => (bool) $user->invitation_pending,
            'invited_at' => $user->invited_at,
            'preferred_locale' => $user->preferred_locale,
        ];

        DB::transaction(function () use ($user, $temporaryPassword, $locale) {
            $user->update([
                'password_hash' => Hash::make($temporaryPassword),
                'must_change_password' => true,
                'password_changed_at' => null,
                'invitation_pending' => false,
                'invited_at' => null,
                'preferred_locale' => $locale,
            ]);
            $user->tokens()->delete();
        });

        $emailStatus = TemporaryCredentialService::EMAIL_STATUS_FAILED;

        try {
            $emailStatus = $this->temporaryCredentialService->deliver($user->fresh(), $temporaryPassword, $locale);
        } catch (\Throwable) {
            $emailStatus = TemporaryCredentialService::EMAIL_STATUS_FAILED;
        }

        if ($emailStatus === TemporaryCredentialService::EMAIL_STATUS_FAILED) {
            DB::transaction(function () use ($user, $previousState) {
                $user->forceFill([
                    'password_hash' => $previousState['password_hash'],
                    'must_change_password' => $previousState['must_change_password'],
                    'password_changed_at' => $previousState['password_changed_at'],
                    'invitation_pending' => $previousState['invitation_pending'],
                    'invited_at' => $previousState['invited_at'],
                    'preferred_locale' => $previousState['preferred_locale'],
                ])->save();
            });

            return response()->json([
                'message' => 'Unable to send the account credentials email. The existing password was kept unchanged.',
                'email_status' => TemporaryCredentialService::EMAIL_STATUS_FAILED,
            ], 500);
        }

        $this->securityAuditService->log(
            eventType: 'admin.user.credentials_resent',
            actor: $admin,
            target: $user,
            request: $request,
            metadata: ['temporary_credentials_rotated' => true]
        );

        return response()->json([
            'message' => $this->resendStatusMessage($emailStatus),
            'email_status' => $emailStatus,
        ]);
    }

    private function emailStatusMessage(string $emailStatus, bool $forUserCreation): string
    {
        $baseSuccess = $forUserCreation
            ? 'User created successfully.'
            : 'Password reset successfully.';

        return match ($emailStatus) {
            TemporaryCredentialService::EMAIL_STATUS_SENT => $baseSuccess . ' Account credentials were accepted by the email server.',
            TemporaryCredentialService::EMAIL_STATUS_LOGGED => $baseSuccess . ' Account credentials were only written to the application log.',
            TemporaryCredentialService::EMAIL_STATUS_NOT_CONFIGURED => $baseSuccess . ' Email delivery is not configured.',
            default => $baseSuccess . ' Account credentials email could not be sent.',
        };
    }

    private function resendStatusMessage(string $emailStatus): string
    {
        return match ($emailStatus) {
            TemporaryCredentialService::EMAIL_STATUS_SENT => 'Account credentials were accepted by the email server.',
            TemporaryCredentialService::EMAIL_STATUS_LOGGED => 'Credentials were generated, but the email was only written to the application log.',
            TemporaryCredentialService::EMAIL_STATUS_NOT_CONFIGURED => 'Credentials were generated, but email delivery is not configured.',
            default => 'Account credentials email could not be sent.',
        };
    }

    /**
     * Toggle user active/inactive (person-x icon)
     */
    public function toggleStatus(int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        // Prevent admin from deactivating themselves
        if (auth()->id() === $id) {
            return response()->json(['message' => 'You cannot deactivate your own account'], 403);
        }

        $newStatus = $user->status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        $user->update(['status' => $newStatus]);

        return response()->json([
            'message' => "User {$newStatus}",
            'status' => $newStatus,
        ]);
    }

    
      
    /**
     * Access logs tab - recent token activity
     */
    public function accessLogs(int $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $tokens = $user->tokens()
            ->orderBy('last_used_at', 'desc')
            ->limit(10)
            ->get(['id', 'name', 'last_used_at', 'expires_at', 'created_at']);

        return response()->json(['logs' => $tokens]);
    }

    /**
     * Paginated access-session activity across all users for the admin log tab.
     */
    public function allAccessLogs(Request $request): JsonResponse
    {
        $search = trim((string) $request->input('search', ''));

        $logs = PersonalAccessToken::query()
            ->with(['tokenable' => fn ($query) => $query->with('role', 'organization')])
            ->where('tokenable_type', User::class)
            ->where('created_at', '>=', now()->subMonth())
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($nested) use ($search) {
                    $nested->where('name', 'like', "%{$search}%")
                        ->orWhereHasMorph('tokenable', [User::class], function ($userQuery) use ($search) {
                            $userQuery->where('full_name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%")
                                ->orWhere('username', 'like', "%{$search}%");
                        });
                });
            })
            ->orderByRaw('COALESCE(last_used_at, created_at) DESC')
            ->paginate($request->integer('per_page', 15));

        $logs->getCollection()->transform(function (PersonalAccessToken $token) {
            /** @var User|null $user */
            $user = $token->tokenable;
            $isExpired = $token->expires_at && $token->expires_at->isPast();

            return [
                'id' => $token->id,
                'token_name' => $token->name,
                'created_at' => $token->created_at,
                'last_used_at' => $token->last_used_at,
                'expires_at' => $token->expires_at,
                'status' => $isExpired ? 'expired' : 'active',
                'user' => $user ? [
                    'user_id' => $user->user_id,
                    'full_name' => $user->full_name,
                    'email' => $user->email,
                    'username' => $user->username,
                    'role' => $user->role?->role_name,
                    'organization' => $user->organization?->organization_name,
                ] : null,
            ];
        });

        return response()->json($logs);
    }
}
