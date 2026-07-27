<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Attendance Report</title>
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
        @page { size: A4 landscape; margin: 30px 34px; }
        body { color: #1e293b; font-family: "Iskoola Pota", "DejaVu Sans", sans-serif; font-size: 10px; }
        .report-tag { margin: 0; color: #0f172a; font-size: 12pt; font-weight: bold; text-align: left; }
        .meeting-title { margin: 16px 0 0; color: #0f172a; font-size: 13pt; font-weight: bold; text-align: center; text-decoration: underline; }
        .meeting-meta { margin: 8px 0 16px; width: 100%; border-collapse: collapse; font-size: 12pt; }
        .meeting-meta td { padding: 3px 10px; text-align: center; vertical-align: top; }
        .meeting-meta td + td { border-left: 1px solid #64748b; }
        .label { color: #64748b; font-size: 8px; font-weight: bold; text-transform: uppercase; }
        .value { margin-top: 3px; color: #0f172a; font-size: 10px; font-weight: bold; }
        .records { width: 100%; border: 1.5pt solid #000000 !important; border-collapse: collapse !important; border-spacing: 0; }
        .records th { padding: 8px; border: 1.5pt solid #000000 !important; background: #1e3a5f; color: white; font-size: 8px; text-align: center; text-transform: uppercase; vertical-align: middle; }
        .records td { padding: 8px; border: 1.5pt solid #000000 !important; text-align: center; vertical-align: middle; }
        .records tr:nth-child(even) td { background: #f8fafc; }
        .status { font-weight: bold; text-transform: capitalize; }
        .present { color: #15803d; }
        .absent { color: #b91c1c; }
        .excused { color: #c2410c; }
        .footer { margin-top: 14px; color: #64748b; font-size: 8px; text-align: right; }
    </style>
</head>
<body>
    <div class="report-tag">Attendance Report</div>
    <div class="meeting-title">{{ $meeting->title }}</div>

    <table class="meeting-meta">
        <tr>
            <td width="30%"><strong>Date:</strong> {{ optional($meeting->meeting_date)->format('d M Y') ?? 'Not assigned' }}</td>
            <td width="30%"><strong>Time:</strong> {{ $meeting->start_time ? substr($meeting->start_time, 0, 5) : '--:--' }} - {{ $meeting->end_time ? substr($meeting->end_time, 0, 5) : '--:--' }}</td>
            <td width="40%"><strong>Venue:</strong> {{ $meeting->location ?: 'Not assigned' }}</td>
        </tr>
    </table>

    <table class="records" border="1" cellspacing="0" cellpadding="0" rules="all" style="width: 100%; border: 1.5pt solid #000000; border-collapse: collapse;">
        <thead>
            <tr>
                <th width="4%" align="center" valign="middle" style="border: 1.5pt solid #000000; text-align: center; vertical-align: middle;">No.</th>
                <th width="19%" align="center" valign="middle" style="border: 1.5pt solid #000000; text-align: center; vertical-align: middle;">Participant</th>
                <th width="17%" align="center" valign="middle" style="border: 1.5pt solid #000000; text-align: center; vertical-align: middle;">Organization</th>
                <th width="14%" align="center" valign="middle" style="border: 1.5pt solid #000000; text-align: center; vertical-align: middle;">Designation</th>
                <th width="12%" align="center" valign="middle" style="border: 1.5pt solid #000000; text-align: center; vertical-align: middle;">Participant Type</th>
                <th width="10%" align="center" valign="middle" style="border: 1.5pt solid #000000; text-align: center; vertical-align: middle;">Status</th>
                <th width="24%" align="center" valign="middle" style="border: 1.5pt solid #000000; text-align: center; vertical-align: middle;">Excuse Reason</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($records as $record)
                <tr>
                    <td align="center" valign="middle" style="border: 1.5pt solid #000000; text-align: center; vertical-align: middle;">{{ $loop->iteration }}</td>
                    <td align="center" valign="middle" style="border: 1.5pt solid #000000; text-align: center; vertical-align: middle;">{{ $record['full_name'] }}</td>
                    <td align="center" valign="middle" style="border: 1.5pt solid #000000; text-align: center; vertical-align: middle;">{{ $record['department'] ?: '—' }}</td>
                    <td align="center" valign="middle" style="border: 1.5pt solid #000000; text-align: center; vertical-align: middle;">{{ $record['role'] ?: '—' }}</td>
                    <td align="center" valign="middle" style="border: 1.5pt solid #000000; text-align: center; vertical-align: middle; text-transform: capitalize;">{{ $record['participant_type'] }}</td>
                    <td align="center" valign="middle" class="status {{ $record['status'] }}" style="border: 1.5pt solid #000000; text-align: center; vertical-align: middle;">{{ $record['status'] }}</td>
                    <td align="center" valign="middle" style="border: 1.5pt solid #000000; text-align: center; vertical-align: middle;">{{ $record['status'] === 'excused' && $record['excuse_reason'] ? $record['excuse_reason'] : '—' }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="footer">Generated {{ now()->format('d M Y, H:i') }} · Meeting letter #{{ $letter->letter_id }}</div>
</body>
</html>
