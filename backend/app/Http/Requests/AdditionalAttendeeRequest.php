<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
}
