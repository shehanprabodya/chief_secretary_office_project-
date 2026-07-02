<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Meeting;
use App\Models\User;
use App\Models\ApprovableDocument;
use App\Models\AttendanceRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminDashboardController extends Controller
{
    public function stats(): JsonResponse
    {
        $totalUsers = User::count();
        $usersThisMonth = User::whereMonth('created_at', now()->month)->count();
        $usersLastMonth = User::whereMonth('created_at', now()->subMonth()->month)->count();
        $userGrowth = $usersLastMonth > 0
            ? round((($usersThisMonth - $usersLastMonth) / $usersLastMonth) * 100)
            : 0;

        $totalMeetings = Meeting::whereMonth('meeting_date', now()->month)->count();

        $pendingApprovals = ApprovableDocument::where('status', 'pending')->count();

        // Average attendance across all submitted records this month
        $total = AttendanceRecord::where('is_draft', false)
            ->whereMonth('created_at', now()->month)
            ->count();
        $present = AttendanceRecord::where('is_draft', false)
            ->where('status', 'present')
            ->whereMonth('created_at', now()->month)
            ->count();
        $avgAttendance = $total > 0 ? round(($present / $total) * 100) : 0;

        return response()->json([
            'total_users' => $totalUsers,
            'user_growth_percent' => $userGrowth,
            'total_meetings' => $totalMeetings,
            'pending_approvals' => $pendingApprovals,
            'avg_attendance' => $avgAttendance,
        ]);
    }

    public function upcomingMeetings(): JsonResponse
    {
        $meetings = Meeting::with('department')
            ->whereDate('meeting_date', '>=', now())
            ->orderBy('meeting_date')
            ->orderBy('start_time')
            ->limit(5)
            ->get()
            ->map(fn($m) => [
                'meeting_id' => $m->meeting_id,
                'title' => $m->title,
                'meeting_date' => $m->meeting_date,
                'start_time' => $m->start_time,
                'location' => $m->location,
                'location_type' => $m->location_type,
                'status' => $m->status,
                'department' => $m->department?->department_name,
            ]);

        return response()->json(['meetings' => $meetings]);
    }

    public function recentActivity(): JsonResponse
    {
        // Aggregate recent events from different tables
        $activities = collect();

        // Recent user registrations
        User::with('role')
            ->orderBy('created_at', 'desc')
            ->limit(3)
            ->get()
            ->each(fn($u) => $activities->push([
                'type' => 'user_registered',
                'title' => 'New User Registered',
                'description' => "{$u->full_name} assigned to {$u->role->role_name}",
                'time' => $u->created_at,
                'color' => 'blue',
            ]));

        // Recent approvals
        ApprovableDocument::orderBy('updated_at', 'desc')
            ->where('status', 'approved')
            ->limit(2)
            ->get()
            ->each(fn($d) => $activities->push([
                'type' => 'approval',
                'title' => 'Proposal Approved',
                'description' => "{$d->subject} approved",
                'time' => $d->updated_at,
                'color' => 'yellow',
            ]));

        // Recent meetings dispatched
        Meeting::where('status', 'scheduled')
            ->orderBy('created_at', 'desc')
            ->limit(2)
            ->get()
            ->each(fn($m) => $activities->push([
                'type' => 'meeting',
                'title' => 'Circular Dispatched',
                'description' => "Meeting notifications sent for {$m->title}",
                'time' => $m->created_at,
                'color' => 'indigo',
            ]));

        return response()->json([
            'activities' => $activities->sortByDesc('time')->values()->take(6),
        ]);
    }
}

