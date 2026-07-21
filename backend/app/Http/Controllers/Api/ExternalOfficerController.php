<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Meeting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExternalOfficerController extends Controller
{
    /**
     * Return only meetings assigned to the authenticated external officer.
     * Letters are limited to approved/dispatched documents so workflow drafts
     * are never exposed outside the office.
     */
    public function dashboard(Request $request): JsonResponse
    {
        $userId = $request->user()->user_id;

        $meetings = Meeting::query()
            ->with([
                'subject:id,code,title',
                'creator:user_id,full_name,designation',
                'letters' => fn ($query) => $query
                    ->whereIn('status', ['approved', 'dispatched'])
                    ->latest('letter_id')
                    ->select([
                        'letter_id',
                        'meeting_id',
                        'title',
                        'content',
                        'designation',
                        'signatory_name',
                        'signature_date',
                        'status',
                    ]),
            ])
            ->withCount('attendees')
            ->whereHas('attendees', fn ($query) => $query->where('users.user_id', $userId))
            ->where('status', '!=', 'cancelled')
            ->orderByRaw("CASE WHEN meeting_date >= ? THEN 0 ELSE 1 END", [now()->toDateString()])
            ->orderBy('meeting_date')
            ->orderBy('start_time')
            ->get()
            ->map(function (Meeting $meeting) {
                $letter = $meeting->letters->first();

                return [
                    'meeting_id' => $meeting->meeting_id,
                    'reference_id' => $meeting->reference_id,
                    'meeting_code' => $meeting->meeting_code,
                    'title' => $meeting->title,
                    'meeting_date' => $meeting->meeting_date?->toDateString(),
                    'start_time' => $meeting->start_time,
                    'end_time' => $meeting->end_time,
                    'location' => $meeting->location,
                    'location_type' => $meeting->location_type,
                    'status' => $meeting->status,
                    'description' => $meeting->description,
                    'attendees_count' => $meeting->attendees_count,
                    'subject' => $meeting->subject,
                    'organizer' => $meeting->creator?->full_name,
                    'organizer_designation' => $meeting->creator?->designation,
                    'letter' => $letter ? [
                        'letter_id' => $letter->letter_id,
                        'title' => $letter->title,
                        'content' => $letter->content,
                        'designation' => $letter->designation,
                        'signatory_name' => $letter->signatory_name,
                        'signature_date' => $letter->signature_date,
                        'status' => $letter->status,
                    ] : null,
                ];
            });

        return response()->json(['meetings' => $meetings]);
    }
}
