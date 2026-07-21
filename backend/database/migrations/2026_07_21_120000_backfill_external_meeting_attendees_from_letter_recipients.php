<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $externalRoleId = DB::table('roles')
            ->where('role_name', 'external_officer')
            ->value('role_id');

        if (!$externalRoleId) {
            return;
        }

        $recipients = DB::table('letter_recipients')
            ->join('letters', 'letters.letter_id', '=', 'letter_recipients.letter_id')
            ->whereNotNull('letters.meeting_id')
            ->get([
                'letters.meeting_id',
                'letter_recipients.user_id',
                'letter_recipients.organization_id',
            ]);

        foreach ($recipients as $recipient) {
            $userIds = collect();

            if ($recipient->user_id) {
                $userIds = DB::table('users')
                    ->where('user_id', $recipient->user_id)
                    ->where('role_id', $externalRoleId)
                    ->where('status', 'ACTIVE')
                    ->pluck('user_id');
            } elseif ($recipient->organization_id) {
                $userIds = DB::table('users')
                    ->where('organization_id', $recipient->organization_id)
                    ->where('role_id', $externalRoleId)
                    ->where('status', 'ACTIVE')
                    ->pluck('user_id');
            }

            foreach ($userIds as $userId) {
                DB::table('meeting_attendees')->updateOrInsert(
                    [
                        'meeting_id' => $recipient->meeting_id,
                        'user_id' => $userId,
                    ],
                    ['attendance_role' => 'assigned']
                );
            }
        }
    }

    public function down(): void
    {
        // Assignments may have been used after creation, so rollback must not
        // remove attendee records that are no longer distinguishable from
        // manually assigned attendees.
    }
};
