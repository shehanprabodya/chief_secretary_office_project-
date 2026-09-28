<!DOCTYPE html>
<html lang="si">
<head>
    <meta charset="UTF-8">
    <style>
        {!! $fontFace !!}
        @page { size: A4 landscape; margin: 30px 38px 40px; }
        * { font-family: "Iskoola Pota", "Noto Sans Sinhala", "DejaVu Sans", sans-serif; }
        body { color: #171717; font-size: 14pt; line-height: 1.25; }
        .office { text-align: center; font-size: 14pt; font-weight: bold; }
        .office-subtitle { text-align: center; font-size: 10px; margin-bottom: 20px; }
        h1 { font-size: 16pt; text-align: center; font-weight: bold; margin: 0 0 10px; }
        .meeting-title { font-weight: bold; text-align: center; font-size: 14pt; text-decoration: underline; margin: 0 0 12px; }
        .facts { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        .facts td { padding: 2px 4px; vertical-align: top; text-align: left; }
        .fact-label { width: 16%; font-weight: bold; }
        .intro { margin: 8px 0 10px; text-align: left; }
        .section-title { font-size: 14pt; font-weight: bold; margin: 10px 0 4px; page-break-after: avoid; }
        table.grid { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 0; }
        table.grid th, table.grid td { border: 1px solid #555; padding: 2px 4px; vertical-align: top; text-align: left; line-height: 1.15; white-space: normal; overflow-wrap: break-word; word-wrap: break-word; }
        table.grid th { background: #efefef; text-align: center; font-weight: bold; }
        table.attendees { width: 100%; table-layout: fixed; }
        table.discussion { width: 100%; table-layout: fixed; }
        .att-no { width: 7%; text-align: center; }
        .att-name { width: 31%; }
        .att-role { width: 62%; }
        .item-no { width: 6%; text-align: center; }
        .item-topic { width: 24%; }
        .item-detail { width: 46%; }
        .item-owner { width: 24%; }
        .closing { margin-top: 10px; text-align: left; }
        .signature { margin-top: 34px; width: 58%; page-break-inside: avoid; }
        .signature-line { margin-bottom: 8px; }
        .footer { position: fixed; bottom: -25px; left: 0; right: 0; text-align: center; font-size: 8px; color: #555; }
        tr { page-break-inside: avoid; }
    </style>
</head>
<body>
    <div class="meeting-title"><u>{{ $meeting->title ?? $meeting->subject->title ?? 'රැස්වීම' }}</u></div>

    <table class="facts">
        <tr>
            <td class="fact-label">දිනය හා වේලාව:</td>
            <td>{{ optional($meeting->meeting_date)->format('Y.m.d') ?? '-' }}{{ $meeting->start_time ? ' ' . (\Illuminate\Support\Carbon::parse($meeting->start_time)->format('A') === 'AM' ? 'පෙ.ව.' : 'ප.ව.') . \Illuminate\Support\Carbon::parse($meeting->start_time)->format('g.i') : '' }}{{ $meeting->end_time ? ' – ' . (\Illuminate\Support\Carbon::parse($meeting->end_time)->format('A') === 'AM' ? 'පෙ.ව.' : 'ප.ව.') . \Illuminate\Support\Carbon::parse($meeting->end_time)->format('g.i') : '' }}</td>
        </tr>
        <tr>
            <td class="fact-label">ස්ථානය:</td>
            <td>{{ $meeting->location ?: 'සඳහන් කර නැත' }}</td>
        </tr>
        @if($meeting->meeting_code)
        <tr>
            <td class="fact-label">රැස්වීම් අංකය:</td>
            <td>{{ $meeting->meeting_code }}</td>
        </tr>
        @endif
    </table>

    @if($minute->meeting_description)
        <div class="intro">{!! nl2br(e($minute->meeting_description)) !!}</div>
    @endif

    <div class="section-title">සහභාගී වූ නිලධාරීන්</div>
    <table class="grid attendees" width="100%" border="1" cellspacing="0" cellpadding="2" style="width:100%; border-collapse:collapse; table-layout:fixed;">
        <colgroup><col width="7%"><col width="31%"><col width="62%"></colgroup>
        <thead><tr><th class="att-no">අනු අංකය</th><th class="att-name">නම</th><th class="att-role">තනතුර හා ආයතනය</th></tr></thead>
        <tbody>
        @forelse($meeting->attendees ?? [] as $index => $attendee)
            <tr>
                <td class="att-no">{{ sprintf('%02d', $index + 1) }}</td>
                <td>{{ $attendee->full_name ?? $attendee->name ?? '-' }}</td>
                <td>{{ $attendee->designation ?? '' }}{{ $attendee->organization?->organization_name ? ', ' . $attendee->organization->organization_name : '' }}</td>
            </tr>
        @empty
            <tr><td colspan="3" style="text-align:center">සහභාගී වූවන් සඳහන් කර නැත.</td></tr>
        @endforelse
        </tbody>
    </table>

    @if($minute->discussion_summary)
        <div class="intro">{!! nl2br(e($minute->discussion_summary)) !!}</div>
    @endif

    <div class="section-title">සාකච්ඡා කරන ලද කරුණු හා ගනු ලැබූ තීරණ</div>
    <table class="grid discussion" width="100%" border="1" cellspacing="0" cellpadding="2" style="width:100%; border-collapse:collapse; table-layout:fixed;">
        <colgroup><col width="6%"><col width="24%"><col width="46%"><col width="24%"></colgroup>
        <thead><tr><th class="item-no">අනු අංකය</th><th class="item-topic">කාරණය</th><th class="item-detail">තීරණය</th><th class="item-owner">වගකීම</th></tr></thead>
        <tbody>
        @php
            $hasItems = $minute->decisions->isNotEmpty() || $minute->actionItems->isNotEmpty();
        @endphp
        @foreach($minute->decisions as $index => $decision)
            <tr>
                <td class="item-no">{{ sprintf('%02d', $index + 1) }}</td>
                <td>{{ $decision->topic ?: '—' }}</td>
                <td>{!! nl2br(e($decision->decision_text)) !!}</td>
                <td>
                    @php
                        $responsibilityIds = json_decode((string) ($decision->responsibility ?? ''), true);
                        if (!is_array($responsibilityIds)) {
                            $legacyAttendee = collect($meeting->attendees ?? [])->first(function ($attendee) use ($decision) {
                                $name = trim(($attendee->full_name ?? '') . ($attendee->designation ? ' — ' . $attendee->designation : ''));
                                $labelParts = array_filter([$name, $attendee->organization?->organization_name, $attendee->organization?->address]);
                                return implode(', ', $labelParts) === $decision->responsibility;
                            });
                            $responsibilityIds = $legacyAttendee ? [$legacyAttendee->user_id] : [];
                        }
                        $responsibleAttendees = collect($meeting->attendees ?? [])->filter(
                            fn ($attendee) => in_array((int) $attendee->user_id, array_map('intval', $responsibilityIds), true)
                        );
                    @endphp
                    @forelse($responsibleAttendees as $attendee)
                        {{ collect([$attendee->designation, $attendee->organization?->address])->filter()->implode(', ') }}@if(!$loop->last)<br>@endif
                    @empty
                        —
                    @endforelse
                </td>
            </tr>
        @endforeach
        @foreach($minute->actionItems as $index => $item)
            <tr>
                <td class="item-no">{{ sprintf('%02d', $minute->decisions->count() + $index + 1) }}</td>
                <td>පසු විපරම් කටයුත්ත</td>
                <td>{!! nl2br(e($item->task_description)) !!}</td>
                <td>{{ $item->responsibleOfficer?->full_name ?? $item->responsibleOfficer?->name ?? '—' }}{{ $item->deadline ? ' · නියමිත දිනය ' . $item->deadline->format('d/m/Y') : '' }}</td>
            </tr>
        @endforeach
        @unless($hasItems)
            <tr><td colspan="4" style="text-align:center">සාකච්ඡා කරුණු සඳහන් කර නැත.</td></tr>
        @endunless
        </tbody>
    </table>

    @if($minute->closing_remarks)
        <div class="closing">{!! nl2br(e($minute->closing_remarks)) !!}</div>
    @endif

    @if($minute->signatory_name || $minute->signatory_designation)
        <div class="signature">
            <div class="signature-line">........................................................</div>
            <strong>{{ $minute->signatory_name }}</strong><br>
            {{ $minute->signatory_designation }}<br>
            දිනය: {{ optional($meeting->meeting_date)->format('Y.m.d') ?? '-' }}
        </div>
    @endif

</body>
</html>
