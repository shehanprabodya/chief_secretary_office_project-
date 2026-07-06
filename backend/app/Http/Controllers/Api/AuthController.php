<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
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
            return response()->json([
                'message' => 'Invalid credentials. Please check your email/username and password.',
            ], 401);
        }

        if (!$user->isActive()) {
            return response()->json([
                'message' => 'Your account is inactive. Please contact the administrator.',
            ], 403);
        }

        $tokenExpiry = $request->boolean('remember_me')
            ? now()->addDays(30)
            : now()->addDay();

        $token = $user->createToken('auth-token', ['*'], $tokenExpiry)->plainTextToken;

        return response()->json([
            'user' => $this->formatUser($user),
            'token' => $token,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    public function logoutAll(Request $request): JsonResponse
    {
        $request->user()->tokens()->delete();

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

    /**
     * Consistent response shape — frontend routes purely on `role` string.
     */
    private function formatUser(User $user): array
    {
        return [
            'id' => (string) $user->user_id,
            'full_name' => $user->full_name,
            'email' => $user->email,
            'username' => $user->username,
            'role' => $user->role->role_name ?? null,
            'organization' => $user->organization->organization_name ?? null,
            'designation'   => $user->designation,
            'status'        => $user->status,
        ];
    }
}
?>