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

    // Lookups - accessible to all authenticated users (needed for forms)
    Route::prefix('admin')->group(function () {
        Route::prefix('lookups')->group(function () {
            Route::get('/roles', [UserManagementController::class, 'roles']);
            Route::get('/organizations', [UserManagementController::class, 'organizations']);
        });
    });

    Route::middleware(['role:admin'])->prefix('admin')->group(function () {
        // Dashboard
        Route::get('/stats', [AdminDashboardController::class, 'stats']);
        Route::get('/upcoming-meetings', [AdminDashboardController::class, 'upcomingMeetings']);
        Route::get('/recent-activity', [AdminDashboardController::class, 'recentActivity']);

        Route::prefix('users')->group(function () {

            Route::get('/stats', [UserManagementController::class, 'stats']);

            Route::get('/', [UserManagementController::class, 'index']);

            Route::post('/', [UserManagementController::class, 'store']);

            Route::get('/{id}', [UserManagementController::class, 'show']);

            Route::put('/{id}', [UserManagementController::class, 'update']);

            Route::post('/{id}/reset-password', [UserManagementController::class, 'resetPassword']);

            Route::patch('/{id}/toggle-status', [UserManagementController::class, 'toggleStatus']);

            Route::get('/{id}/logs', [UserManagementController::class, 'accessLogs']);
        });
    });

   


    Route::middleware('role:officer')->prefix('officer')->group(function () {
        // Meetings
        Route::get('/meetings', [MeetingController::class, 'index']);
        Route::get('/meetings/by-date', [MeetingController::class, 'byDate']);
        Route::get('/meetings/{id}', [MeetingController::class, 'show']);
        Route::post('/meetings', [MeetingController::class, 'store']);
        Route::put('/meetings/{id}', [MeetingController::class, 'update']);
        Route::delete('/meetings/{id}', [MeetingController::class, 'destroy']);

        // Letters
        Route::get('/letters',                   [LetterController::class, 'index']);
        Route::get('/letters/{id}',              [LetterController::class, 'show']);
        Route::post('/letters/draft',            [LetterController::class, 'saveDraft']);
        Route::get('/letters/{id}/generate',     [LetterController::class, 'generate']);
        Route::get('/letters/{id}/preview',      [LetterController::class, 'preview']);
        Route::get('/letters/{id}/download/pdf', [LetterController::class, 'downloadPdf']);
        Route::get('/letters/{id}/download/docx', [LetterController::class, 'downloadDocx']);
        Route::get('/letter-recipients/orgs',    [LetterController::class, 'getOrganizations']);
        Route::get('/subjects',                  [LetterController::class, 'getSubjects']);
        
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

    Route::middleware('role:dept_head,deputy,chief_secretary')->group(function () {
        // Route::get('/approvals/pending', [ApprovalController::class, 'pending']);
    });
    
});
?>
