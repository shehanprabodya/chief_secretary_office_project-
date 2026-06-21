<?php
use App\Http\Controllers\Api\AuthController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/logout-all', [AuthController::class, 'logoutAll']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    // Example future protected routes per role
    Route::middleware('role:admin')->group(function () {
        // Route::get('/admin/users', [UserController::class, 'index']);
    });

    Route::middleware('role:officer')->group(function () {
        // Route::get('/meetings/my-assigned', [MeetingController::class, 'assigned']);
    });

    Route::middleware('role:dept_head,deputy,chief_secretary')->group(function () {
        // Route::get('/approvals/pending', [ApprovalController::class, 'pending']);
    });
});
?>