<?php
use App\Http\Controllers\Api\AuthController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\MeetingController;
use App\Http\Controllers\Api\LetterController;

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
    // Meetings
    Route::get('/meetings', [MeetingController::class, 'index']);
    Route::get('/meetings/by-date', [MeetingController::class, 'byDate']);
    Route::get('/meetings/{id}', [MeetingController::class, 'show']);
    Route::post('/meetings', [MeetingController::class, 'store']);
    Route::put('/meetings/{id}', [MeetingController::class, 'update']);
    Route::delete('/meetings/{id}', [MeetingController::class, 'destroy']);

    // Letters
    Route::get('/letters', [LetterController::class, 'index']);
    Route::get('/letters/{id}', [LetterController::class, 'show']);
    Route::post('/letters', [LetterController::class, 'store']);
    Route::put('/letters/{id}', [LetterController::class, 'update']);
    Route::post('/letters/{id}/send-for-approval', [LetterController::class, 'sendForApproval']);
    Route::post('/letters/{id}/approve', [LetterController::class, 'approve']);
    Route::post('/letters/{id}/reject', [LetterController::class, 'reject']);
    Route::delete('/letters/{id}', [LetterController::class, 'destroy']);

    // Attendance
    Route::get('/meetings/{meetingId}/attendance', [AttendanceController::class, 'show']);
    Route::post('/meetings/{meetingId}/attendance/draft', [AttendanceController::class, 'saveDraft']);
    Route::post('/meetings/{meetingId}/attendance/submit', [AttendanceController::class, 'submit']);
    Route::get('/meetings/{meetingId}/attendance/search', [AttendanceController::class, 'search']);

});
?>