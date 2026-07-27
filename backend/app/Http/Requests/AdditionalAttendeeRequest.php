<?php

namespace App\Http\Requests;

use App\Models\AdditionalAttendee;
use App\Models\LetterRecipient;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class AdditionalAttendeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Organizer authorization is enforced by the controller in Step 6.
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'full_name' => $this->filled('full_name')
                ? trim((string) $this->input('full_name'))
                : $this->input('full_name'),
            'organization' => $this->filled('organization')
                ? trim((string) $this->input('organization'))
                : $this->input('organization'),
            'designation' => $this->filled('designation')
                ? trim((string) $this->input('designation'))
                : $this->input('designation'),
            'email' => $this->filled('email')
                ? strtolower(trim((string) $this->input('email')))
                : null,
            'addition_reason' => $this->filled('addition_reason')
                ? trim((string) $this->input('addition_reason'))
                : $this->input('addition_reason'),
        ]);
    }

    public function rules(): array
    {
        $meetingId = (int) $this->route('meetingId');

        return [
            'letter_id' => [
                'required',
                'integer',
                Rule::exists('letters', 'letter_id')
                    ->where(fn ($query) => $query->where('meeting_id', $meetingId)),
            ],
            'user_id' => [
                'nullable',
                'integer',
                Rule::exists('users', 'user_id')
                    ->where(fn ($query) => $query->where('status', 'ACTIVE')),
            ],
            'full_name' => ['required', 'string', 'max:255'],
            'organization' => ['required', 'string', 'max:255'],
            'designation' => ['required', 'string', 'max:150'],
            'email' => ['nullable', 'email:rfc', 'max:255'],
            'addition_reason' => ['required', 'string', 'min:5', 'max:2000'],
            'attendance_status' => ['sometimes', 'in:present,absent,excused'],
        ];
    }

    public function messages(): array
    {
        return [
            'letter_id.exists' => 'The selected letter does not belong to this meeting.',
            'user_id.exists' => 'The selected registered user does not exist or is inactive.',
            'full_name.required' => 'The participant name is required.',
            'organization.required' => 'The participant organization is required.',
            'designation.required' => 'The participant designation is required.',
            'addition_reason.required' => 'Please explain why this participant is being added.',
            'addition_reason.min' => 'The addition reason must contain at least 5 characters.',
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->has('letter_id')) {
                    return;
                }

                $letterId = (int) $this->input('letter_id');
                $additionalAttendeeId = (int) ($this->route('additionalAttendeeId')
                    ?? $this->route('id')
                    ?? 0);
                $userId = $this->filled('user_id') ? (int) $this->input('user_id') : null;

                if ($userId) {
                    if ($validator->errors()->has('user_id')) {
                        return;
                    }

                    $this->validateRegisteredUserDuplicate(
                        $validator,
                        $letterId,
                        $userId,
                        $additionalAttendeeId
                    );

                    return;
                }

                $this->validateGuestDuplicate($validator, $letterId, $additionalAttendeeId);
            },
        ];
    }

    private function validateRegisteredUserDuplicate(
        Validator $validator,
        int $letterId,
        int $userId,
        int $additionalAttendeeId
    ): void {
        $user = User::find($userId);

        if (!$user) {
            return;
        }

        $isLetterRecipient = LetterRecipient::where('letter_id', $letterId)
            ->where(function ($query) use ($user) {
                $query->where('user_id', $user->user_id);

                if ($user->organization_id) {
                    $query->orWhere(function ($organizationQuery) use ($user) {
                        $organizationQuery->whereNull('user_id')
                            ->where('organization_id', $user->organization_id);
                    });
                }
            })
            ->exists();

        if ($isLetterRecipient) {
            $validator->errors()->add(
                'user_id',
                'This registered user is already represented in the approved meeting letter.'
            );

            return;
        }

        $alreadyAdded = AdditionalAttendee::where('letter_id', $letterId)
            ->where('user_id', $userId)
            ->when(
                $additionalAttendeeId,
                fn ($query) => $query->where('additional_attendee_id', '!=', $additionalAttendeeId)
            )
            ->exists();

        if ($alreadyAdded) {
            $validator->errors()->add(
                'user_id',
                'This registered user has already been added to the attendance record.'
            );
        }
    }

    private function validateGuestDuplicate(
        Validator $validator,
        int $letterId,
        int $additionalAttendeeId
    ): void {
        if (!$this->filled('full_name') || !$this->filled('organization')) {
            return;
        }

        $normalizedName = mb_strtolower(trim((string) $this->input('full_name')));
        $normalizedOrganization = mb_strtolower(trim((string) $this->input('organization')));

        $alreadyAdded = AdditionalAttendee::where('letter_id', $letterId)
            ->whereNull('user_id')
            ->whereRaw('LOWER(TRIM(full_name)) = ?', [$normalizedName])
            ->whereRaw('LOWER(TRIM(organization)) = ?', [$normalizedOrganization])
            ->when(
                $additionalAttendeeId,
                fn ($query) => $query->where('additional_attendee_id', '!=', $additionalAttendeeId)
            )
            ->exists();

        if ($alreadyAdded) {
            $validator->errors()->add(
                'full_name',
                'A participant with this name and organization has already been added.'
            );
        }
    }
}
