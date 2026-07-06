<?php
use App\Http\Controllers\Api\AuthController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\MeetingController;
use App\Http\Controllers\Api\LetterController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\ApprovalController;
use App\Http\Controllers\Api\MinuteController;
use App\Http\Controllers\Api\admin\AdminDashboardController;
use App\Http\Controllers\Api\admin\UserManagementController;

Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/logout-all', [AuthController::class, 'logoutAll']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    // Dashboard
    Route::get('/stats', [AdminDashboardController::class, 'stats']);
    Route::get('/upcoming-meetings', [AdminDashboardController::class, 'upcomingMeetings']);
    Route::get('/recent-activity', [AdminDashboardController::class, 'recentActivity']);

    // User Management
    Route::get('/users/stats', [UserManagementController::class, 'stats']);
    Route::get('/users', [UserManagementController::class, 'index']);
    Route::post('/users', [UserManagementController::class, 'store']);
    Route::get('/users/{id}', [UserManagementController::class, 'show']);
    Route::put('/users/{id}', [UserManagementController::class, 'update']);
    Route::post('/users/{id}/reset-password', [UserManagementController::class, 'resetPassword']);
    Route::patch('/users/{id}/toggle-status', [UserManagementController::class, 'toggleStatus']);
    Route::get('/roles', [UserManagementController::class, 'roles']);
    Route::get('/users/{id}/logs', [UserManagementController::class, 'accessLogs']);
    });

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

    // Approvals
    Route::get('/approvals', [ApprovalController::class, 'index']);
    Route::get('/approvals/{id}', [ApprovalController::class, 'show']);
    Route::post('/approvals', [ApprovalController::class, 'store']);
    Route::post('/approvals/{id}/approve', [ApprovalController::class, 'approve']);
    Route::post('/approvals/{id}/reject', [ApprovalController::class, 'reject']);
    Route::post('/approvals/{id}/comments', [ApprovalController::class, 'addComment']);

    //minutes
    Route::get('/minutes', [MinuteController::class, 'index']);
    Route::get('/minutes/{id}', [MinuteController::class, 'show']);
    Route::get('/meetings/{meetingId}/minutes', [MinuteController::class, 'getOrCreateForMeeting']);
    Route::put('/minutes/{id}', [MinuteController::class, 'saveDraft']);
    Route::post('/minutes/{id}/submit', [MinuteController::class, 'submitForApproval']);

    Route::post('/minutes/{minuteId}/decisions', [MinuteController::class, 'addDecision']);
    Route::delete('/decisions/{decisionId}', [MinuteController::class, 'deleteDecision']);

    Route::post('/minutes/{minuteId}/action-items', [MinuteController::class, 'addActionItem']);
    Route::delete('/action-items/{itemId}', [MinuteController::class, 'deleteActionItem']);

});
?>