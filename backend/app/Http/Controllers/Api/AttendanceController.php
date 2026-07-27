<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdditionalAttendee;
use App\Models\ApprovableDocument;
use App\Models\AttendanceExcuseRequest;
use App\Models\AttendanceRecord;
use App\Models\Letter;
use App\Models\Meeting;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\Process\Process;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class AttendanceController extends Controller
{
    /**
     * Search fully approved meeting letters that can open attendance.
     */
    public function approvedMeetingLetters(Request $request): JsonResponse
    {
        $search = trim((string) $request->get('search', ''));

        $documents = ApprovableDocument::where('document_type', 'letter')
            ->where('status', 'approved')
            ->with([
                'sourceLetter.meeting',
                'sourceLetter.subject',
                'sourceLetter.recipients.user.organization',
                'sourceLetter.recipients.organization',
            ])
            ->whereHas('sourceLetter', function ($letterQuery) use ($search) {
                $letterQuery->whereNotNull('meeting_id');

                if ($search !== '') {
                    $letterQuery->where(function ($q) use ($search) {
                        $q->where('title', 'like', "%{$search}%")
                            ->orWhere('meeting_code', 'like', "%{$search}%")
                            ->orWhereHas('meeting', function ($meetingQuery) use ($search) {
                                $meetingQuery->where('title', 'like', "%{$search}%")
                                    ->orWhere('meeting_code', 'like', "%{$search}%");
                            })
                            ->orWhereHas('subject', function ($subjectQuery) use ($search) {
                                $subjectQuery->where('title', 'like', "%{$search}%")
                                    ->orWhere('code', 'like', "%{$search}%");
                            });
                    });
                }
            })
            ->latest('document_id')
            ->limit(100)
            ->get();

        $letters = $documents
            ->map(function ($document) {
                $letter = $document->sourceLetter;
                $meeting = $letter?->meeting;

                if (!$letter || !$meeting) {
                    return null;
                }

                return [
                    'letter_id' => $letter->letter_id,
                    'meeting_id' => $meeting->meeting_id,
                    'meeting_title' => $meeting->title,
                    'letter_title' => strip_tags($letter->title ?: ($letter->subject?->title ?? '')),
                    'subject_code' => $letter->subject?->code ?? $letter->meeting_code,
                    'subject_title' => $letter->subject?->title,
                    'meeting_date' => optional($meeting->meeting_date)->toDateString(),
                    'start_time' => $meeting->start_time,
                    'end_time' => $meeting->end_time,
                    'location' => $meeting->location,
                    'recipient_count' => $letter->recipients->whereNotNull('user_id')->count(),
                ];
            })
            ->filter()
            ->values();

        return response()->json(['letters' => $letters]);
    }

    /**
     * Get attendance sheet from the approved meeting letter recipients.
     * New recipient rows default to absent until the officer marks them otherwise.
     */
    public function showByLetter(Request $request, int $letterId): JsonResponse
    {
        $letter = Letter::with('subject')
            ->where('letter_id', $letterId)
            ->where('status', 'approved')
            ->first();

        $meeting = null;

        if ($letter?->meeting_id) {
            $meeting = Meeting::find($letter->meeting_id);
        } elseif ($letter?->meeting_code) {
            $meeting = Meeting::where('meeting_code', $letter->meeting_code)->first();
        }

        if (!$letter) {
            return response()->json([
                'message' => 'Attendance can be opened only after the meeting letter is fully approved.',
            ], 422);
        }

        if (!$meeting && !$letter->meeting_code && !$letter->subject?->code) {
            return response()->json([
                'message' => 'Attendance can be opened only after the approved letter is linked to a subject or meeting.',
            ], 422);
        }

        if (!$meeting) {
            $meeting = $this->createAttendanceMeetingForLetter($letter);
        }

        if ((int) $letter->meeting_id !== (int) $meeting->meeting_id || $letter->meeting_code !== $meeting->meeting_code) {
            $letter->update([
                'meeting_id' => $meeting->meeting_id,
                'meeting_code' => $meeting->meeting_code,
            ]);
        }

        $request->merge(['letter_id' => $letterId]);

        return $this->show($request, $meeting->meeting_id);
    }

    private function createAttendanceMeetingForLetter(Letter $letter): Meeting
    {
        $meetingCode = $letter->meeting_code ?: $letter->subject?->code;
        $title = trim(strip_tags($letter->title ?: '')) ?: ($letter->subject?->title ?? 'Approved letter attendance');
        $meetingDate = $letter->signature_date
            ?: optional($letter->created_at)->toDateString()
            ?: now()->toDateString();

        return Meeting::firstOrCreate(
            ['meeting_code' => $meetingCode],
            [
                'title' => $title,
                'meeting_date' => $meetingDate,
                'start_time' => null,
                'end_time' => null,
                'location' => null,
                'location_type' => 'not_assigned',
                'status' => 'scheduled',
                'description' => 'Attendance record created from approved letter #' . $letter->letter_id,
                'created_by' => $letter->created_by,
            ]
        );
    }

    public function show(Request $request, int $meetingId): JsonResponse
    {
        $meeting = Meeting::findOrFail($meetingId);
        $letterId = $request->integer('letter_id');
        $approvedLetterQuery = Letter::where('status', 'approved')
            ->with([
                'recipients.user.organization',
                'recipients.user.role',
                'recipients.organization',
                'recipients.organization.users.organization',
                'recipients.organization.users.role',
            ])
            ->latest('letter_id');

        if ($letterId) {
            $approvedLetterQuery
                ->where('letter_id', $letterId)
                ->where(function ($query) use ($meeting) {
                    $query->where('meeting_id', $meeting->meeting_id)
                        ->orWhere('meeting_code', $meeting->meeting_code);
                });
        } else {
            $approvedLetterQuery->where('meeting_id', $meetingId);
        }

        $approvedLetter = $approvedLetterQuery->first();

        if (!$approvedLetter) {
            return response()->json([
                'message' => 'Attendance can be opened only after the meeting letter is fully approved.',
            ], 422);
        }

        $existingRecords = AttendanceRecord::where('meeting_id', $meetingId)
            ->where(function ($query) use ($approvedLetter) {
                $query->where('letter_id', $approvedLetter->letter_id)
                    ->orWhereNull('letter_id');
            })
            ->with('user.organization', 'user.role')
            ->get();

        $recordsByUser = $existingRecords->whereNotNull('user_id')->keyBy('user_id');
        $recordsByRecipient = $existingRecords->whereNotNull('letter_recipient_id')->keyBy('letter_recipient_id');
        $recordsByAdditional = $existingRecords
            ->whereNotNull('additional_attendee_id')
            ->keyBy('additional_attendee_id');

        $recipientParticipants = $approvedLetter->recipients
            ->map(function ($recipient) use ($recordsByUser, $recordsByRecipient) {
                $user = $recipient->user;

                // Older letters sometimes stored only the organization even
                // when that organization has one unambiguous registered officer.
                if (!$user && $recipient->organization?->users?->count() === 1) {
                    $user = $recipient->organization->users->first();
                }
                $record = $user
                    ? ($recordsByUser->get($user->user_id)
                        ?? $recordsByRecipient->get($recipient->letter_recipient_id))
                    : $recordsByRecipient->get($recipient->letter_recipient_id);

                return [
                    'participant_type' => 'invited',
                    'additional_attendee_id' => null,
                    'user_id' => $user?->user_id,
                    'letter_recipient_id' => $user ? null : $recipient->letter_recipient_id,
                    'full_name' => $user?->full_name
                        ?? $recipient->recipient_label
                        ?? $recipient->organization?->organization_name
                        ?? 'Organization representative',
                    'email' => $user?->email ?? '',
                    'department' => $user?->organization?->organization_name
                        ?? $recipient->organization?->organization_name,
                    'role' => $user?->designation
                        ?? $recipient->recipient_label
                        ?? 'Organization representative',
                    'addition_reason' => null,
                    'status' => $record?->status ?? 'absent',
                ];
            })
            ->unique(fn ($participant) => $participant['user_id']
                ? 'user-'.$participant['user_id']
                : ($participant['additional_attendee_id']
                    ? 'additional-'.$participant['additional_attendee_id']
                    : 'recipient-'.$participant['letter_recipient_id']));

        // Keep previously saved people visible even if the letter recipients are edited later.
        $savedParticipants = $existingRecords
            ->filter(fn ($record) => $record->user)
            ->map(function ($record) {
                $user = $record->user;

                return [
                    'participant_type' => 'invited',
                    'additional_attendee_id' => null,
                    'user_id' => $user->user_id,
                    'letter_recipient_id' => null,
                    'full_name' => $user->full_name,
                    'email' => $user->email,
                    'department' => $user->organization?->organization_name,
                    'role' => $user->designation ?? $user->role?->role_name,
                    'addition_reason' => null,
                    'status' => $record->status,
                ];
            });

        $additionalParticipants = AdditionalAttendee::where('meeting_id', $meeting->meeting_id)
            ->where('letter_id', $approvedLetter->letter_id)
            ->orderBy('created_at')
            ->get()
            ->map(function (AdditionalAttendee $additionalAttendee) use ($recordsByAdditional) {
                $record = $recordsByAdditional->get($additionalAttendee->additional_attendee_id);

                return [
                    'participant_type' => 'additional',
                    'additional_attendee_id' => $additionalAttendee->additional_attendee_id,
                    'registered_user_id' => $additionalAttendee->user_id,
                    'user_id' => null,
                    'letter_recipient_id' => null,
                    'full_name' => $additionalAttendee->full_name,
                    'email' => $additionalAttendee->email ?? '',
                    'department' => $additionalAttendee->organization,
                    'role' => $additionalAttendee->designation,
                    'addition_reason' => $additionalAttendee->addition_reason,
                    'status' => $record?->status ?? 'absent',
                ];
            });

        $participants = $recipientParticipants
            ->concat($savedParticipants)
            ->concat($additionalParticipants)
            ->unique(fn ($participant) => $participant['user_id']
                ? 'user-'.$participant['user_id']
                : ($participant['additional_attendee_id']
                    ? 'additional-'.$participant['additional_attendee_id']
                    : 'recipient-'.$participant['letter_recipient_id']))
            ->values();

        $present = $participants->where('status', 'present')->count();
        $absent = $participants->where('status', 'absent')->count();
        $excused = $participants->where('status', 'excused')->count();
        $total = $participants->count();

        return response()->json([
            'meeting' => $meeting,
            'letter_id' => $approvedLetter->letter_id,
            'participants' => $participants->values(),
            'statistics' => [
                'attendance_percentage' => $total > 0 ? round(($present / $total) * 100) : 0,
                'present' => $present,
                'absent' => $absent,
                'excused' => $excused,
            ],
        ]);
    }

    /**
     * Save draft.
     */
    public function saveDraft(Request $request, int $meetingId): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'letter_id' => 'required|exists:letters,letter_id',
            'records' => 'required|array',
            'records.*.user_id' => 'nullable|exists:users,user_id|required_without_all:records.*.letter_recipient_id,records.*.additional_attendee_id',
            'records.*.letter_recipient_id' => 'nullable|exists:letter_recipients,letter_recipient_id|required_without_all:records.*.user_id,records.*.additional_attendee_id',
            'records.*.additional_attendee_id' => 'nullable|exists:additional_attendees,additional_attendee_id|required_without_all:records.*.user_id,records.*.letter_recipient_id',
            'records.*.status' => 'required|in:present,absent,excused',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $letter = Letter::where('letter_id', $request->integer('letter_id'))
            ->where('meeting_id', $meetingId)
            ->where('created_by', $request->user()->user_id)
            ->first();

        if (!$letter) {
            return response()->json(['message' => 'Only the meeting letter creator can edit attendance.'], 403);
        }

        $validRecipientIds = $letter->recipients()->pluck('letter_recipient_id');
        $validAdditionalAttendeeIds = AdditionalAttendee::where('meeting_id', $meetingId)
            ->where('letter_id', $letter->letter_id)
            ->pluck('additional_attendee_id');

        foreach ($request->records as $record) {
            $identityCount = collect([
                $record['user_id'] ?? null,
                $record['letter_recipient_id'] ?? null,
                $record['additional_attendee_id'] ?? null,
            ])->filter(fn ($value) => $value !== null && $value !== '')->count();

            if ($identityCount !== 1) {
                return response()->json([
                    'message' => 'Each attendance row must identify exactly one participant.',
                ], 422);
            }

            if (!empty($record['letter_recipient_id']) && !$validRecipientIds->contains((int) $record['letter_recipient_id'])) {
                return response()->json(['message' => 'An attendance recipient does not belong to this meeting letter.'], 422);
            }

            if (!empty($record['additional_attendee_id'])
                && !$validAdditionalAttendeeIds->contains((int) $record['additional_attendee_id'])) {
                return response()->json([
                    'message' => 'An additional attendee does not belong to this meeting letter.',
                ], 422);
            }
        }

        foreach ($request->records as $record) {
            if (!empty($record['user_id'])) {
                $identity = [
                    'letter_id' => $letter->letter_id,
                    'user_id' => $record['user_id'],
                ];
            } elseif (!empty($record['letter_recipient_id'])) {
                $identity = [
                    'letter_id' => $letter->letter_id,
                    'letter_recipient_id' => $record['letter_recipient_id'],
                ];
            } else {
                $identity = [
                    'letter_id' => $letter->letter_id,
                    'additional_attendee_id' => $record['additional_attendee_id'],
                ];
            }

            AttendanceRecord::updateOrCreate(
                $identity,
                [
                    'meeting_id' => $meetingId,
                    'user_id' => $record['user_id'] ?? null,
                    'letter_recipient_id' => $record['letter_recipient_id'] ?? null,
                    'additional_attendee_id' => $record['additional_attendee_id'] ?? null,
                    'status' => $record['status'],
                    'is_draft' => true,
                    'recorded_by' => $request->user()->user_id,
                ]
            );
        }

        return response()->json(['message' => 'Draft saved']);
    }

    /**
     * Finalize attendance ("Submit Attendance" button)
     */
    public function submit(Request $request, int $meetingId): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'letter_id' => 'required|exists:letters,letter_id',
            'confirm_pending_excuses' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $letter = Letter::where('letter_id', $request->integer('letter_id'))
            ->where('meeting_id', $meetingId)
            ->where('created_by', $request->user()->user_id)
            ->first();

        if (!$letter) {
            return response()->json(['message' => 'Only the meeting letter creator can submit attendance.'], 403);
        }

        $pendingExcuseCount = AttendanceExcuseRequest::where('meeting_id', $meetingId)
            ->where('status', 'pending')
            ->count();

        if ($pendingExcuseCount > 0 && !$request->boolean('confirm_pending_excuses')) {
            return response()->json([
                'message' => 'Pending excuse requests must be reviewed or explicitly confirmed before attendance is submitted.',
                'pending_excuse_count' => $pendingExcuseCount,
            ], 409);
        }

        AttendanceRecord::where('meeting_id', $meetingId)
            ->where('letter_id', $letter->letter_id)
            ->update(['is_draft' => false]);

        return response()->json(['message' => 'Attendance submitted and synced']);
    }

    /**
     * Export the attendance rows currently displayed by the client as a PDF.
     */
    public function exportPdf(Request $request, int $meetingId): Response
    {
        $validator = Validator::make($request->all(), [
            'letter_id' => 'required|exists:letters,letter_id',
            'records' => 'required|array|max:1000',
            'records.*.user_id' => 'nullable|integer|exists:users,user_id',
            'records.*.full_name' => 'required|string|max:255',
            'records.*.department' => 'nullable|string|max:255',
            'records.*.role' => 'nullable|string|max:255',
            'records.*.status' => 'required|in:present,absent,excused',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'The attendance report could not be prepared.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $meeting = Meeting::findOrFail($meetingId);
        $letter = Letter::where('letter_id', $request->integer('letter_id'))
            ->where('status', 'approved')
            ->where(function ($query) use ($meeting) {
                $query->where('meeting_id', $meeting->meeting_id)
                    ->orWhere('meeting_code', $meeting->meeting_code);
            })
            ->firstOrFail();

        $canIncludeExcuseReasons = (int) $meeting->created_by === (int) $request->user()->user_id
            || (int) $letter->created_by === (int) $request->user()->user_id;
        $approvedExcuses = $canIncludeExcuseReasons
            ? AttendanceExcuseRequest::where('meeting_id', $meeting->meeting_id)
                ->where('status', 'approved')
                ->get()
                ->keyBy('user_id')
            : collect();

        $records = collect($validator->validated()['records'])
            ->map(function (array $record) use ($approvedExcuses) {
                $record['excuse_reason'] = null;

                if ($record['status'] !== 'excused' || empty($record['user_id'])) {
                    return $record;
                }

                $excuseRequest = $approvedExcuses->get((int) $record['user_id']);
                if (!$excuseRequest) {
                    return $record;
                }

                $category = match ($excuseRequest->reason_category) {
                    'official_duty' => 'Official duty',
                    'medical' => 'Medical reason',
                    'schedule_conflict' => 'Schedule conflict',
                    default => 'Other',
                };
                $record['excuse_reason'] = $category . ': ' . $excuseRequest->reason_details;

                return $record;
            });
        $statistics = [
            'total' => $records->count(),
            'present' => $records->where('status', 'present')->count(),
            'absent' => $records->where('status', 'absent')->count(),
            'excused' => $records->where('status', 'excused')->count(),
        ];
        $statistics['percentage'] = $statistics['total'] > 0
            ? round(($statistics['present'] / $statistics['total']) * 100)
            : 0;

        $fontPath = base_path('../frontend/public/fonts/Iskoola Pota Regular.ttf');
        $fontUrl = is_file($fontPath) ? 'file://' . $fontPath : null;
        $html = view('attendance.report', compact('meeting', 'letter', 'records', 'statistics', 'fontUrl'))->render();
        $options = new \Dompdf\Options();
        $options->set('isHtml5ParserEnabled', true);
        $options->set('isRemoteEnabled', true);
        $options->set('defaultFont', 'Iskoola Pota');
        $options->setChroot([base_path(), dirname($fontPath)]);

        // Use a writable, persistent cache so Dompdf can embed the Sinhala
        // typeface in every downloaded attendance report.
        $dompdfFontDir = storage_path('app/dompdf-fonts');
        if (!is_dir($dompdfFontDir)) {
            mkdir($dompdfFontDir, 0775, true);
        }
        $options->set('fontDir', $dompdfFontDir);
        $options->set('fontCache', $dompdfFontDir);

        $dompdf = new \Dompdf\Dompdf($options);
        if (is_file($fontPath)) {
            $dompdf->getFontMetrics()->registerFont([
                'family' => 'Iskoola Pota',
                'weight' => 'normal',
                'style' => 'normal',
            ], 'file://' . $fontPath);
        }
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'landscape');
        $dompdf->render();

        $safeReference = preg_replace('/[^A-Za-z0-9_-]+/', '-', $meeting->meeting_code ?: (string) $meeting->meeting_id);
        $filename = 'attendance-' . trim($safeReference, '-') . '-' . now()->format('Ymd') . '.pdf';

        // LibreOffice uses a full text-shaping engine, which is required for
        // Sinhala vowel signs and conjunct characters to be positioned
        // correctly. Dompdf remains the fallback for servers without it.
        try {
            $path = $this->convertAttendanceHtmlWithLibreOffice($html);

            return response()->download($path, $filename, [
                'Content-Type' => 'application/pdf',
            ])->deleteFileAfterSend(true);
        } catch (Throwable) {
            // Continue with the Dompdf output prepared above.
        }

        return response($dompdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    private function convertAttendanceHtmlWithLibreOffice(string $html): string
    {
        $binary = collect(['/usr/bin/libreoffice', '/usr/bin/soffice'])
            ->first(fn (string $path) => is_executable($path));

        if (!$binary) {
            throw new \RuntimeException('LibreOffice is not installed.');
        }

        $workDir = sys_get_temp_dir() . '/attendance-export-' . uniqid('', true);
        $profileDir = $workDir . '/lo-profile';
        $runtimeDir = $workDir . '/runtime';
        $fontCacheDir = $workDir . '/font-cache';
        mkdir($workDir, 0775, true);
        mkdir($profileDir, 0775, true);
        mkdir($runtimeDir, 0700, true);
        mkdir($fontCacheDir, 0775, true);

        $htmlPath = $workDir . '/attendance.html';
        file_put_contents($htmlPath, $html);

        $fontDir = base_path('../frontend/public/fonts');
        $escapeXml = static fn (string $value): string => htmlspecialchars(
            $value,
            ENT_XML1 | ENT_QUOTES,
            'UTF-8'
        );
        $fontConfigPath = $workDir . '/fonts.conf';
        file_put_contents(
            $fontConfigPath,
            '<?xml version="1.0"?>'
            . '<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">'
            . '<fontconfig><dir>' . $escapeXml($fontDir) . '</dir>'
            . '<cachedir>' . $escapeXml($fontCacheDir) . '</cachedir>'
            . '<config><rescan><int>0</int></rescan></config></fontconfig>'
        );

        $process = new Process([
            $binary,
            '--headless',
            '-env:UserInstallation=file://' . $profileDir,
            '--convert-to',
            'pdf:writer_pdf_Export',
            '--outdir',
            $workDir,
            $htmlPath,
        ]);
        $process->setEnv([
            'HOME' => $workDir,
            'XDG_RUNTIME_DIR' => $runtimeDir,
            'FONTCONFIG_FILE' => $fontConfigPath,
            'FONTCONFIG_PATH' => $workDir,
            'SAL_FONTPATH' => $fontDir,
            'LANG' => 'en_US.UTF-8',
        ]);
        $process->setTimeout(60);
        $process->run();

        $outputPath = $workDir . '/attendance.pdf';
        if (!is_file($outputPath)) {
            throw new \RuntimeException(trim($process->getErrorOutput() . "\n" . $process->getOutput()));
        }

        return $outputPath;
    }

    /**
     * Search participants by name, department, or role within a meeting
     */
    public function search(Request $request, int $meetingId): JsonResponse
    {
        $search = $request->get('q', '');

        $meeting = Meeting::findOrFail($meetingId);
        $attendees = $meeting->attendees()
            ->with('organization', 'role')
            ->where(function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                    ->orWhereHas('organization', function ($orgQuery) use ($search) {
                        $orgQuery->where('organization_name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('role', function ($roleQuery) use ($search) {
                        $roleQuery->where('role_name', 'like', "%{$search}%");
                    });
            })
            ->get();

        return response()->json(['participants' => $attendees]);
    }
}

?>
