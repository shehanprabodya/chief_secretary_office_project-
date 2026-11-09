<?php

namespace App\Services;

use App\Jobs\SendDocumentDistribution;
use App\Models\DocumentSignature;
use App\Models\EmailDistribution;
use App\Models\Letter;
use App\Models\MeetingMinute;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DocumentDistributionService
{
    /** @return Collection<int, array<string, mixed>> */
    public function recipients(string $type, Letter|MeetingMinute $document): Collection
    {
        $meeting = $document->meeting()->with(['attendees.organization', 'additionalAttendees.registeredUser.organization'])->first();
        $people = collect();
        foreach ($meeting?->attendees ?? [] as $user) $people->push($this->person('attendee:'.$user->user_id, $user->user_id, $user->full_name, $user->email, $user->organization?->organization_name));
        foreach ($meeting?->additionalAttendees ?? [] as $attendee) $people->push($this->person('additional:'.$attendee->additional_attendee_id, $attendee->user_id, $attendee->full_name ?: $attendee->registeredUser?->full_name, $attendee->email ?: $attendee->registeredUser?->email, $attendee->organization ?: $attendee->registeredUser?->organization?->organization_name));
        if ($type === 'letter') foreach ($document->recipients()->with(['user.organization', 'organization'])->get() as $recipient) $people->push($this->person('letter:'.$recipient->letter_recipient_id, $recipient->user_id, $recipient->user?->full_name ?? $recipient->recipient_label, $recipient->user?->email, $recipient->organization?->organization_name));

        $existing = EmailDistribution::query()->where('document_type', $type)->where('document_id', $document->getKey())->get()->keyBy('recipient_email');
        return $people->filter(fn ($person) => filter_var($person['email'], FILTER_VALIDATE_EMAIL))->unique(fn ($person) => strtolower($person['email']))->map(function ($person) use ($existing) {
            $record = $existing->get($person['email']);
            return $person + ['status' => $record?->status, 'distribution_id' => $record?->distribution_id, 'attempt_count' => $record?->attempt_count ?? 0, 'error_details' => $record?->error_details];
        })->values();
    }

    public function queue(string $type, Letter|MeetingMinute $document, User $actor, array $recipientKeys): array
    {
        $this->assertSignedFinal($type, $document);
        $candidates = $this->recipients($type, $document)->keyBy('key');
        if (!$recipientKeys) throw ValidationException::withMessages(['recipient_keys' => ['Select at least one valid recipient.']]);
        $selected = collect($recipientKeys)->unique()->map(fn ($key) => $candidates->get($key))->filter();
        if ($selected->count() !== count(array_unique($recipientKeys))) throw ValidationException::withMessages(['recipient_keys' => ['One or more selected recipients are not associated with this document.']]);

        $subject = $this->subject($type, $document);
        $records = DB::transaction(function () use ($selected, $type, $document, $actor, $subject) {
            return $selected->map(function ($person) use ($type, $document, $actor, $subject) {
                $record = EmailDistribution::query()->firstOrNew(['document_type' => $type, 'document_id' => $document->getKey(), 'recipient_key' => $person['key']]);
                if ($record->exists && $record->status === 'sent') throw ValidationException::withMessages(['recipient_keys' => ['A selected recipient has already received this document.']]);
                $record->fill(['recipient_user_id' => $person['user_id'], 'recipient_name' => $person['name'], 'recipient_email' => $person['email'], 'email_subject' => $subject, 'status' => 'queued', 'error_details' => null, 'created_by' => $actor->user_id]);
                $record->save();
                return $record;
            })->values();
        });
        foreach ($records as $record) SendDocumentDistribution::dispatch($record->distribution_id)->onQueue('mail');
        return $this->summary($type, $document->getKey());
    }

    public function history(string $type, int $documentId): array
    {
        return ['records' => EmailDistribution::query()->where('document_type', $type)->where('document_id', $documentId)->latest('updated_at')->get(), 'summary' => $this->summary($type, $documentId)];
    }

    private function assertSignedFinal(string $type, Letter|MeetingMinute $document): void
    {
        if ($document->status !== 'approved' && !($type === 'letter' && $document->status === 'dispatched')) throw ValidationException::withMessages(['document' => ['Only finalized and approved documents can be distributed.']]);
        $signature = DocumentSignature::query()->where('document_type', $type)->where('document_id', $document->getKey())->latest('signed_at')->first();
        $path = $signature?->signed_pdf_path ? storage_path('app/'.$signature->signed_pdf_path) : null;
        if (!$path || !is_file($path) || ($signature->signed_pdf_sha256 && !hash_equals($signature->signed_pdf_sha256, hash_file('sha256', $path)))) throw ValidationException::withMessages(['document' => ['A valid final signed PDF is required before email distribution.']]);
    }

    private function person(string $key, ?int $userId, ?string $name, ?string $email, ?string $organization): array { return compact('key', 'userId', 'name', 'email', 'organization') + ['user_id' => $userId]; }
    private function subject(string $type, Letter|MeetingMinute $document): string { $meeting = $document->meeting; return $type === 'letter' ? 'Official Meeting Invitation – '.($meeting?->title ?? $document->title) : 'Approved Minutes of Meeting – '.($meeting?->title ?? 'Meeting').' – '.($meeting?->meeting_date?->format('Y-m-d') ?? ''); }
    private function summary(string $type, int $id): array { $records = EmailDistribution::query()->where('document_type', $type)->where('document_id', $id); return ['total' => (clone $records)->count(), 'sent' => (clone $records)->where('status', 'sent')->count(), 'failed' => (clone $records)->where('status', 'failed')->count(), 'pending' => (clone $records)->whereIn('status', ['pending', 'queued', 'sending'])->count()]; }
}
