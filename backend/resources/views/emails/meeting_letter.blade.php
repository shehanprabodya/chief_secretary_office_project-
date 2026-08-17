<p>Dear Recipient,</p>

<p>Please find attached the meeting letter.</p>

@if (!empty($letter->title))
<p><strong>Subject:</strong> {{ $letter->title }}</p>
@endif

<p>Regards,<br>
{{ $letter->sender_name ?? 'Chief Secretary Office' }}</p>
