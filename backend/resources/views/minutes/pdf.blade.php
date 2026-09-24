<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">

    <style>
        @if ($fontUrl)
        @font-face {
            font-family: "Iskoola Pota";
            font-style: normal;
            font-weight: normal;
            src: url("{{ $fontUrl }}") format("truetype");
        }
        @font-face {
            font-family: "Iskoola Pota";
            font-style: normal;
            font-weight: bold;
            src: url("{{ $fontUrl }}") format("truetype");
        }
        @endif

        @page {
            margin: 35px 35px 45px 35px;
        }

        * {
            font-family: "Iskoola Pota", "Noto Sans Sinhala", "DejaVu Sans", sans-serif;
        }

        body {
            font-family: "Iskoola Pota", "Noto Sans Sinhala", "DejaVu Sans", sans-serif;
            font-size: 12px;
            color: #111;
            line-height: 1.4;
        }

        table,
        th,
        td,
        div,
        p,
        span,
        strong,
        em,
        b,
        i {
            font-family: "Iskoola Pota", "Noto Sans Sinhala", "DejaVu Sans", sans-serif;
            font-size: 12px;
        }

        .header {
            text-align: center;
            margin-bottom: 15px;
        }

        .header-title {
            font-size: 16px;
            font-weight: bold;
        }

        .header-subtitle {
            font-size: 12px;
            margin-top: 3px;
        }

        .document-title {
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            margin: 15px 0;
            text-transform: uppercase;
        }

        .meeting-info {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }

        .meeting-info td {
            border: 1px solid #555;
            padding: 6px;
        }

        .label {
            font-weight: bold;
            width: 15%;
            background: #f2f2f2;
        }

        .value {
            width: 35%;
        }

        table.minutes {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }

        table.minutes th,
        table.minutes td {
            border: 1px solid #333;
            padding: 6px;
            vertical-align: top;
        }

        table.minutes th {
            background: #e9ecef;
            text-align: center;
            font-weight: bold;
        }

        .col-no {
            width: 5%;
            text-align: center;
        }

        .col-discussion {
            width: 50%;
        }

        .col-officer {
            width: 20%;
        }

        .col-deadline {
            width: 12%;
            text-align: center;
        }

        .col-status {
            width: 13%;
            text-align: center;
        }

        .section-title {
            font-size: 12px;
            font-weight: bold;
            margin-top: 15px;
            margin-bottom: 7px;
        }

        .summary {
            border: 1px solid #555;
            padding: 8px;
            margin-bottom: 12px;
        }

        .attendees {
            width: 100%;
            border-collapse: collapse;
        }

        .attendees th,
        .attendees td {
            border: 1px solid #555;
            padding: 5px;
        }

        .attendees th {
            background: #eee;
        }

        .signature-area {
            margin-top: 40px;
            width: 100%;
        }

        .signature {
            width: 40%;
            display: inline-block;
            text-align: center;
        }

        .page-break {
            page-break-before: always;
        }

        .footer {
            position: fixed;
            bottom: -25px;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 8px;
        }

    </style>
</head>

<body>

    {{-- Header --}}

    <div class="header">

        <div class="header-title">
            SOUTHERN PROVINCIAL COUNCIL
        </div>

        <div class="header-subtitle">
            OFFICE OF THE CHIEF SECRETARY
        </div>

    </div>


    <div class="document-title">
        MINUTES OF THE MEETING
    </div>


    {{-- Meeting Information --}}

    <table class="meeting-info">

        <tr>

            <td class="label">
                Meeting Code
            </td>

            <td class="value">
                {{ $meeting->meeting_code ?? '-' }}
            </td>

            <td class="label">
                Date
            </td>

            <td class="value">
                {{ optional($meeting->meeting_date)->format('d/m/Y') ?? '-' }}
            </td>

        </tr>

        <tr>

            <td class="label">
                Subject
            </td>

            <td colspan="3">

                {{ $meeting->subject->subject_name
                    ?? $meeting->title
                    ?? '-' }}

            </td>

        </tr>

        <tr>

            <td class="label">
                Venue
            </td>

            <td colspan="3">
                {{ $meeting->venue ?? '-' }}
            </td>

        </tr>

    </table>


    {{-- Discussion Summary --}}

    <div class="section-title">
        1. Discussion Summary
    </div>

    <div class="summary">

        {!! nl2br(e($minute->discussion_summary ?? 'No discussion summary recorded.')) !!}

    </div>


    {{-- Decisions --}}

    <div class="section-title">
        2. Decisions and Action Items
    </div>

    <table class="minutes">

        <thead>

            <tr>

                <th class="col-no">
                    No.
                </th>

                <th class="col-discussion">
                    Decision / Action
                </th>

                <th class="col-officer">
                    Responsible Officer
                </th>

                <th class="col-deadline">
                    Deadline
                </th>

                <th class="col-status">
                    Status
                </th>

            </tr>

        </thead>

        <tbody>

            {{-- Decisions --}}

            @forelse($minute->decisions as $decision)

                <tr>

                    <td class="col-no">
                        {{ $decision->decision_order }}
                    </td>

                    <td class="col-discussion">

                        {!! nl2br(e($decision->decision_text)) !!}

                    </td>

                    <td class="col-officer">
                        -
                    </td>

                    <td class="col-deadline">
                        -
                    </td>

                    <td class="col-status">
                        Decision
                    </td>

                </tr>

            @empty

                <tr>

                    <td colspan="5" style="text-align:center;">
                        No decisions recorded.
                    </td>

                </tr>

            @endforelse


            {{-- Action Items --}}

            @foreach($minute->actionItems as $index => $item)

                <tr>

                    <td class="col-no">
                        {{ $minute->decisions->count() + $index + 1 }}
                    </td>

                    <td class="col-discussion">

                        {!! nl2br(e($item->task_description)) !!}

                    </td>

                    <td class="col-officer">

                        {{ $item->responsibleOfficer->full_name
                            ?? $item->responsibleOfficer->name
                            ?? '-' }}

                    </td>

                    <td class="col-deadline">

                        {{ optional($item->deadline)->format('d/m/Y') ?? '-' }}

                    </td>

                    <td class="col-status">

                        {{ ucfirst($item->status ?? 'Pending') }}

                    </td>

                </tr>

            @endforeach

        </tbody>

    </table>


    {{-- Attendance --}}

    @if($meeting->attendees && $meeting->attendees->count())

        <div class="section-title">
            3. Attendance
        </div>

        <table class="attendees">

            <thead>

                <tr>

                    <th style="width:6%;">
                        No.
                    </th>

                    <th style="width:30%;">
                        Name
                    </th>

                    <th style="width:30%;">
                        Designation
                    </th>

                    <th style="width:34%;">
                        Organization
                    </th>

                </tr>

            </thead>

            <tbody>

                @foreach($meeting->attendees as $index => $attendee)

                    <tr>

                        <td style="text-align:center;">
                            {{ $index + 1 }}
                        </td>

                        <td>
                            {{ $attendee->full_name ?? $attendee->name ?? '-' }}
                        </td>

                        <td>
                            {{ $attendee->designation ?? '-' }}
                        </td>

                        <td>
                            {{ $attendee->organization->organization_name ?? '-' }}
                        </td>

                    </tr>

                @endforeach

            </tbody>

        </table>

    @endif


    {{-- Signature --}}

    <div class="signature-area">

        <div class="signature">

            ............................................

            <br>

            Prepared By

        </div>


        <div class="signature" style="float:right;">

            ............................................

            <br>

            Approved By

        </div>

    </div>


    <div class="footer">

        Meeting Management & Coordination System
        |
        Southern Provincial Council

    </div>

</body>

</html>