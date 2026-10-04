<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Laravel\Sanctum\PersonalAccessToken;

class UserManagementController extends Controller
{
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
    

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'full_name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'username' => 'required|string|max:100|unique:users,username',
            'password' => 'required|string|min:8',
            'role_id' => 'required|exists:roles,role_id',
            'organization_id' => 'nullable|exists:organizations,organization_id',
            'status' => 'nullable|in:ACTIVE,INACTIVE',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = User::create([
            'full_name'=>$request->full_name,
            'email'=>$request->email,
            'username'=>$request->username,
            'password_hash'=>Hash::make($request->password),
            'designation'=>$request->designation,
            'role_id'=>$request->role_id,
            'organization_id'=>$request->organization_id,
            'status'=>$request->status ?? 'ACTIVE',
        ]);

        return response()->json([
            'message' => 'User created successfully',
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
            'email' => "sometimes|email|unique:users,email,{$id},user_id",
            'username' => "sometimes|string|max:100|unique:users,username,{$id},user_id",
            'role_id' => 'sometimes|exists:roles,role_id',
            'designation'=>'nullable|string|max:150',
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
            'new_password' => 'required|string|min:8',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        User::findOrFail($id)->update([
            'password_hash' => Hash::make($request->new_password),
        ]);

        return response()->json(['message' => 'Password reset successfully']);
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
