<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RequireAdmin
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $user->loadMissing('role');

        if ($user->role->role_name !== 'admin') {
            return response()->json(['message' => 'Admin access required'], 403);
        }

        return $next($request);
    }
}
