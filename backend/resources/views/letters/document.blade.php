@if ($standalone)
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
@endif
    <style>
        {!! $fontFace !!}

        @@page {
            size: 8in 297mm;
            margin: 10mm;
        }

        html,
        body {
            margin: 0;
            padding: 0;
        }

        .letter-page {
            width: 100%;
            box-sizing: border-box;
            color: #000;
            font-family: "Iskoola Pota", "Noto Sans Sinhala", "DejaVu Sans", sans-serif;
            font-size: 12pt;
            line-height: 1.3;
            letter-spacing: normal;
            word-spacing: -1.5pt;
        }

        .letter-page * {
            box-sizing: border-box;
            font-family: "Iskoola Pota", "Noto Sans Sinhala", "DejaVu Sans", sans-serif;
            font-size: 12pt;
            letter-spacing: normal;
            word-spacing: -1.5pt;
        }

        .letterhead-meta {
            width: 100%;
            margin-bottom: 0;
            border-collapse: collapse;
            table-layout: fixed;
        }

        .letterhead-top-spacer,
        .letterhead-bottom-spacer {
            padding: 0 !important;
            font-size: 0 !important;
            line-height: 0 !important;
        }

        .letterhead-meta td {
            padding: 0;
            vertical-align: top;
            font-family: Calibri, Arial, sans-serif;
            font-size: 12pt;
        }

        /* Positions are measured from the physical left edge of the page.
           The printable area begins after the 10mm page margin. */
        .letterhead-spacer {
            width: 28.1mm; /* 1.5in - 10mm */
        }

        .letterhead-subject-column {
            width: 127mm; /* 6.5in - 1.5in */
        }

        .letterhead-date-column {
            width: 28.1mm; /* remaining printable width */
        }

        .letterhead-date {
            text-align: left;
            white-space: nowrap;
        }

        .recipients {
            margin-top: 5.3mm;
            margin-bottom: 22px;
            padding: 0;
            line-height: 1.15;
            text-align: left;
        }

        .recipients span,
        .signature span {
            display: inline;
            margin: 0;
            padding: 0;
            line-height: 1.15;
        }

        .subject {
            margin: 22px 0;
            font-size: 13pt !important;
            font-weight: bold;
            text-align: center;
            text-decoration: underline;
        }

        .subject,
        .subject * {
            font-size: 13pt !important;
        }

        .subject p {
            margin: 0;
        }

        .body {
            font-size: 12pt !important;
            text-align: justify;
            word-spacing: -1.5pt !important;
        }

        .body,
        .body * {
            font-size: 12pt !important;
            word-spacing: -1.5pt !important;
        }

        .body p {
            margin: 0 0 14px;
            line-height: 1.3;
            text-indent: 0;
        }

        .body p + p {
            line-height: 1.5;
        }

        .signature {
            margin-top: 42px;
            padding: 0;
            font-size: 12pt !important;
            line-height: 1.15;
        }

        .signature span {
            margin: 0;
            font-size: 12pt !important;
            line-height: 1.15;
        }
    </style>
@if ($standalone)
</head>
<body>
@endif
    <div class="letter-page">
        <table class="letterhead-meta" role="presentation" width="692" cellspacing="0" cellpadding="0">
            <colgroup>
                <col class="letterhead-spacer">
                <col class="letterhead-subject-column">
                <col class="letterhead-date-column">
            </colgroup>
            <tr>
                <td class="letterhead-top-spacer" colspan="3" height="154">&nbsp;</td>
            </tr>
            <tr>
                <td class="letterhead-spacer" width="106">&nbsp;</td>
                <td class="letterhead-subject letterhead-subject-column" width="480">{{ $subjectCode }}</td>
                <td class="letterhead-date letterhead-date-column" width="106">{{ $date }}</td>
            </tr>
        </table>

        <div class="recipients">
            @foreach ($recipientLines as $recipientLine)
                <span>{{ $recipientLine }}</span>@if (! $loop->last)<br>@endif
            @endforeach
        </div>

        <div class="subject">{!! $titleHtml !!}</div>
        <div class="body">{!! $bodyHtml !!}</div>

        <div class="signature">
            <span>{{ $signatoryName }}</span><br>
            <span>{{ $designation }}</span><br>
            <span>{{ $office }}</span>
        </div>
    </div>
@if ($standalone)
</body>
</html>
@endif
