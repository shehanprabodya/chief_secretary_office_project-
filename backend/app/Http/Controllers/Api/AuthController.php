<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\PasswordChangedMail;
use App\Models\User;
use App\Services\InvitationService;
use App\Services\SecurityAuditService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    public function __construct(
        private readonly SecurityAuditService $securityAuditService,
        private readonly InvitationService $invitationService,
    ) {
    }

    /**
     * Login with EITHER email or username
     */
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'identifier' => 'required|string',
            'password'   => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $identifier = $request->input('identifier');

        $user = User::with('role', 'organization')
            ->where('email', $identifier)
            ->orWhere('username', $identifier)
            ->first();

        if (!$user || !Hash::check($request->password, $user->password_hash)) {
            $this->securityAuditService->log(
                eventType: 'auth.login.failed',
                request: $request,
                severity: 'warning',
                metadata: ['identifier' => (string) $request->input('identifier')]
            );

            return response()->json([
                'message' => 'Invalid credentials. Please check your email/username and password.',
            ], 401);
        }

        if (!$user->isActive()) {
            return response()->json([
                'message' => 'Your account is inactive. Please contact the administrator.',
            ], 403);
        }

        $user->update(['last_login_at' => now()]);

        $tokenExpiry = $request->boolean('remember_me')
            ? now()->addDays(30)
            : now()->addDay();

        $token = $user->createToken('auth-token', ['*'], $tokenExpiry)->plainTextToken;

        $this->securityAuditService->log(
            eventType: 'auth.login.success',
            actor: $user,
            target: $user,
            request: $request,
            metadata: ['remember_me' => $request->boolean('remember_me')]
        );

        return response()->json([
            'user' => $this->formatUser($user),
            'token' => $token,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        $request->user()->currentAccessToken()->delete();

        $this->securityAuditService->log(
            eventType: 'auth.logout',
            actor: $user,
            target: $user,
            request: $request
        );

        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    public function logoutAll(Request $request): JsonResponse
    {
        $user = $request->user();
        $request->user()->tokens()->delete();

        $this->securityAuditService->log(
            eventType: 'auth.logout_all',
            actor: $user,
            target: $user,
            request: $request,
            severity: 'warning'
        );

        return response()->json([
            'message' => 'Logged out from all devices',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('role', 'organization');

        return response()->json([
            'user' => $this->formatUser($user),
        ]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'locale' => 'nullable|in:en,si',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $status = Password::sendResetLink([
            'email' => $request->string('email')->toString(),
        ]);

        $target = User::where('email', $request->string('email')->toString())->first();
        $this->securityAuditService->log(
            eventType: 'auth.password.forgot_requested',
            target: $target,
            request: $request,
            severity: $status === Password::RESET_LINK_SENT ? 'info' : 'warning'
        );

        return response()->json([
            'message' => 'If your email is registered, a password reset link has been sent.',
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'token' => 'required|string',
            'email' => 'required|email',
            'password' => ['required', 'confirmed', 'string', 'min:12', 'regex:/[a-z]/', 'regex:/[A-Z]/', 'regex:/[0-9]/', 'regex:/[^A-Za-z0-9]/'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $status = Password::reset(
            $validator->validated(),
            function (User $user, string $password) use ($request) {
                $locale = $user->preferred_locale ?? ($request->input('locale', 'en'));

                DB::transaction(function () use ($user, $password, $request) {
                    $user->forceFill([
                        'password_hash' => Hash::make($password),
                        'password_changed_at' => now(),
                        'invitation_pending' => false,
                    ])->save();

                    $user->tokens()->delete();

                    $this->securityAuditService->log(
                        eventType: 'auth.password.reset_completed',
                        actor: $user,
                        target: $user,
                        request: $request,
                        severity: 'warning'
                    );
                });

                if (!app()->runningUnitTests()) {
                    Mail::to($user->email)->send(new PasswordChangedMail($user->fresh(), $locale));
                }
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            $this->securityAuditService->log(
                eventType: 'auth.password.reset_failed',
                request: $request,
                severity: 'warning',
                metadata: ['email' => (string) $request->input('email')]
            );

            return response()->json([
                'message' => 'The password reset link is invalid or expired.',
            ], 422);
        }

        return response()->json([
            'message' => 'Password reset successful. Please sign in again.',
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'password' => ['required', 'confirmed', 'string', 'min:12', 'regex:/[a-z]/', 'regex:/[A-Z]/', 'regex:/[0-9]/', 'regex:/[^A-Za-z0-9]/'],
            'logout_other_devices' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        /** @var User $user */
        $user = $request->user();

        if (!Hash::check((string) $request->input('current_password'), $user->password_hash)) {
            $this->securityAuditService->log(
                eventType: 'auth.password.change_failed_current_password',
                actor: $user,
                target: $user,
                request: $request,
                severity: 'warning'
            );

            return response()->json([
                'message' => 'Current password is incorrect.',
            ], 422);
        }

        DB::transaction(function () use ($user, $request) {
            $user->update([
                'password_hash' => Hash::make((string) $request->input('password')),
                'password_changed_at' => now(),
            ]);

            $user->tokens()->delete();

            $this->securityAuditService->log(
                eventType: 'auth.password.changed',
                actor: $user,
                target: $user,
                request: $request,
                severity: 'warning'
            );
        });

        $user->refresh();
        if (!app()->runningUnitTests()) {
            Mail::to($user->email)->send(new PasswordChangedMail($user, $user->preferred_locale ?? 'en'));
        }

        return response()->json([
            'message' => 'Password changed successfully.',
        ]);
    }

    public function setLanguage(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'locale' => 'required|in:en,si',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        /** @var User $user */
        $user = $request->user();
        $user->update(['preferred_locale' => (string) $request->input('locale')]);

        return response()->json(['message' => 'Language preference updated.']);
    }

    public function validateInvitation(Request $request, int $invitationId): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'token' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $invitation = $this->invitationService->validateInvitation($invitationId, (string) $request->input('token'));
        } catch (\Throwable) {
            return response()->json(['message' => 'Invitation is invalid or expired.'], 422);
        }

        return response()->json([
            'invitation' => [
                'id' => $invitation->invitation_id,
                'expires_at' => $invitation->expires_at,
                'locale' => $invitation->locale,
                'user' => [
                    'full_name' => $invitation->user->full_name,
                    'email' => $invitation->user->email,
                    'username' => $invitation->user->username,
                    'role' => $invitation->user->role?->role_name,
                    'organization' => $invitation->user->organization?->organization_name,
                ],
            ],
        ]);
    }

    public function acceptInvitation(Request $request, int $invitationId): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'token' => 'required|string',
            'password' => ['required', 'confirmed', 'string', 'min:12', 'regex:/[a-z]/', 'regex:/[A-Z]/', 'regex:/[0-9]/', 'regex:/[^A-Za-z0-9]/'],
            'locale' => 'nullable|in:en,si',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $invitation = $this->invitationService->validateInvitation($invitationId, (string) $request->input('token'));
        } catch (\Throwable) {
            return response()->json(['message' => 'Invitation is invalid or expired.'], 422);
        }

        DB::transaction(function () use ($invitation, $request) {
            $user = $invitation->user;
            $locale = in_array((string) $request->input('locale'), ['en', 'si'], true)
                ? (string) $request->input('locale')
                : $invitation->locale;

            $user->update([
                'password_hash' => Hash::make((string) $request->input('password')),
                'invitation_pending' => false,
                'password_changed_at' => now(),
                'preferred_locale' => $locale,
            ]);

            $invitation->update([
                'accepted_at' => now(),
                'invalidated_at' => null,
            ]);

            $user->tokens()->delete();

            if (!app()->runningUnitTests()) {
                Mail::to($user->email)->send(new PasswordChangedMail($user, $locale));
            }

            $this->securityAuditService->log(
                eventType: 'auth.invitation.accepted',
                actor: $user,
                target: $user,
                request: $request,
                severity: 'warning',
                metadata: ['invitation_id' => $invitation->invitation_id]
            );
        });

        return response()->json([
            'message' => 'Invitation accepted. You can now sign in.',
        ]);
    }

    /**
     * Consistent response shape — frontend routes purely on `role` string.
     */
    private function formatUser(User $user): array
    {
        return [
            'id' => (string) $user->user_id,
            'full_name' => $user->full_name,
            'full_name_si' => $user->full_name_si,
            'email' => $user->email,
            'username' => $user->username,
            'role' => $user->role->role_name ?? null,
            'organization' => $user->organization->organization_name ?? null,
            'designation'   => $user->designation,
            'designation_si'   => $user->designation_si,
            'status'        => $user->status,
            'preferred_locale' => $user->preferred_locale ?? 'en',
        ];
    }
}
?>