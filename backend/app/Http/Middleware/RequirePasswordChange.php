<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RequirePasswordChange
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        if (!$user || !$user->must_change_password) {
            return $next($request);
        }

        // These endpoints are necessary to complete the password-change flow.
        if (
            $request->is('api/auth/change-password')
            || $request->is('api/auth/logout')
            || $request->is('api/auth/logout-all')
            || $request->is('api/auth/me')
        ) {
            return $next($request);
        }

        return response()->json([
            'message' => 'You must change your temporary password before continuing.',
            'must_change_password' => true,
        ], 403);
    }
}
