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
        h1 { margin: 0; color: #0f172a; font-size: 21px; }
        .subtitle { margin-top: 4px; color: #64748b; font-size: 10px; }
        .details { margin: 18px 0 12px; width: 100%; }
        .details td { padding: 5px 12px 5px 0; vertical-align: top; }
        .label { color: #64748b; font-size: 8px; font-weight: bold; text-transform: uppercase; }
        .value { margin-top: 3px; color: #0f172a; font-size: 10px; font-weight: bold; }
        .summary { margin: 0 0 16px; width: 100%; border-collapse: separate; border-spacing: 6px 0; }
        .summary td { padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 4px; background: #f8fafc; }
        .summary .number { color: #0f172a; font-size: 16px; font-weight: bold; }
        .records { width: 100%; border-collapse: collapse; }
        .records th { padding: 8px; border: 1px solid #cbd5e1; background: #1e3a5f; color: white; font-size: 8px; text-align: left; text-transform: uppercase; }
        .records td { padding: 8px; border: 1px solid #dbe3ec; vertical-align: top; }
        .records tr:nth-child(even) td { background: #f8fafc; }
        .status { font-weight: bold; text-transform: capitalize; }
        .present { color: #15803d; }
        .absent { color: #b91c1c; }
        .excused { color: #c2410c; }
        .footer { margin-top: 14px; color: #64748b; font-size: 8px; text-align: right; }
    </style>
</head>
<body>
    <h1>Attendance Report</h1>
    <div class="subtitle">Chief Secretary's Office</div>

    <table class="details">
        <tr>
            <td width="40%">
                <div class="label">Meeting</div>
                <div class="value">{{ $meeting->title }}</div>
            </td>
            <td width="20%">
                <div class="label">Date</div>
                <div class="value">{{ optional($meeting->meeting_date)->format('d M Y') ?? 'Not assigned' }}</div>
            </td>
            <td width="20%">
                <div class="label">Time</div>
                <div class="value">{{ $meeting->start_time ? substr($meeting->start_time, 0, 5) : '--:--' }} - {{ $meeting->end_time ? substr($meeting->end_time, 0, 5) : '--:--' }}</div>
            </td>
            <td width="20%">
                <div class="label">Venue</div>
                <div class="value">{{ $meeting->location ?: 'Not assigned' }}</div>
            </td>
        </tr>
    </table>

    <table class="summary">
        <tr>
            <td><span class="label">Attendance</span><br><span class="number">{{ $statistics['percentage'] }}%</span></td>
            <td><span class="label">Total</span><br><span class="number">{{ $statistics['total'] }}</span></td>
            <td><span class="label">Present</span><br><span class="number">{{ $statistics['present'] }}</span></td>
            <td><span class="label">Absent</span><br><span class="number">{{ $statistics['absent'] }}</span></td>
            <td><span class="label">Excused</span><br><span class="number">{{ $statistics['excused'] }}</span></td>
        </tr>
    </table>

    <table class="records">
        <thead>
            <tr>
                <th width="5%">No.</th>
                <th width="30%">Participant</th>
                <th width="27%">Organization</th>
                <th width="23%">Designation</th>
                <th width="15%">Status</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($records as $record)
                <tr>
                    <td>{{ $loop->iteration }}</td>
                    <td>{{ $record['full_name'] }}</td>
                    <td>{{ $record['department'] ?: '—' }}</td>
                    <td>{{ $record['role'] ?: '—' }}</td>
                    <td class="status {{ $record['status'] }}">{{ $record['status'] }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="footer">Generated {{ now()->format('d M Y, H:i') }} · Meeting letter #{{ $letter->letter_id }}</div>
</body>
</html>
