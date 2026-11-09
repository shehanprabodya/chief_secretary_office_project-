@if ($standalone)
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
@endif
@if ($preview ?? false)
    <div class="recipients" style="margin-bottom: 0.5cm;">
        @foreach ($recipientLines as $recipientLine)
            <span>{{ $recipientLine }}</span>@if (! $loop->last)<br>@endif
        @endforeach
    </div>

    <div class="subject" style="margin-bottom: 0.5cm;">{!! $titleHtml !!}</div>
    <div class="body" style="text-align: justify; text-align-last: left;">{!! $bodyHtml !!}</div>

    <div class="signature" style="margin-top: 0.5cm;">
        @if (!empty($signatureDataUri))
            <img src="{{ $signatureDataUri }}" alt="Official signature" style="max-height: 52px; max-width: 180px; display: block; margin-bottom: 0.25cm; object-fit: contain;" />
        @endif
        @if (!empty($isDelegatedSignature) && !empty($delegatedPrefixLine))
            <span>{{ $delegatedPrefixLine }}</span><br>
        @endif
        <span>{{ $signatoryName }}</span><br>
        <span>{{ $designation }}</span><br>
        <span>{{ $office }}</span>
    </div>
@else
    <style>
        {!! $fontFace !!}

        @@page {
            size: A4 portrait;
            margin: 0;
        }

        html,
        body {
            margin: 0;
            padding: 0;
            width: 210mm;
            min-height: 297mm;
            background: #fff;
            font-family: "Iskoola Pota", sans-serif;
            overflow: hidden;
        }

        .letter-page {
            position: relative;
            width: 210mm;
            height: 297mm;
            margin: 0 auto;
            background: #fff;
            box-sizing: border-box;
            color: #000;
            font-family: "Iskoola Pota", sans-serif;
            font-size: 12pt;
            line-height: 1.3;
        }

        .letter-page * {
            box-sizing: border-box;
            font-family: "Iskoola Pota", sans-serif !important;
            font-size: 12pt;
            line-height: 1.3;
            letter-spacing: normal;
            word-spacing: normal;
        }

        .subject-date-row {
            position: absolute;
            top: 57mm;
            left: 38.1mm;
            width: 177.8mm;
            display: flex;
            align-items: center;
            white-space: nowrap;
        }

        .subject-code {
            flex: 0 0 139.7mm;
            font-size: 12pt;
            font-weight: 400;
            text-align: left;
            color: #000;
        }

        .date-text {
            flex: 0 0 auto;
            min-width: 0;
            font-size: 12pt;
            font-weight: 400;
            text-align: left;
            color: #000;
        }

        .document-body {
            position: absolute;
            top: 70mm;
            left: 30.48mm;
            width: calc(210mm - 30.48mm - 17.78mm);
            max-width: 161.72mm;
            color: #000;
        }

        .recipients {
            margin: 0 0 0.5cm;
            line-height: 1.3;
            text-align: left;
            color: #000;
        }

        .recipients span,
        .signature span {
            display: inline;
            margin: 0;
            padding: 0;
            line-height: 1.3;
        }

        .subject {
            margin: 0 0 0.5cm;
            text-align: left;
            font-size: 13pt !important;
            font-weight: 700;
            text-decoration: underline;
            color: #000;
        }

        .subject,
        .subject * {
            font-size: 13pt !important;
            line-height: 1.3;
            text-align: left !important;
        }

        .subject p {
            margin: 0;
        }

        .body {
            font-size: 12pt !important;
            line-height: 1.3;
            text-align: justify;
            text-align-last: left;
            color: #000;
            overflow-wrap: break-word;
        }

        .body,
        .body * {
            font-size: 12pt !important;
            line-height: 1.3;
            text-align: justify !important;
            text-align-last: left !important;
        }

        .body p {
            margin: 0 0 0.7em;
            line-height: 1.3;
            text-indent: 0;
            text-align: justify;
            text-align-last: left;
        }

        .body ul,
        .body ol {
            margin: 0 0 0.7em 1.2em;
            padding-left: 1.2em;
        }

        .body table {
            width: 100%;
            border-collapse: collapse;
        }

        .body td,
        .body th {
            padding: 0.2em 0.35em;
            vertical-align: top;
        }

        .signature {
            margin-top: 18pt;
            line-height: 1.3;
            color: #000;
        }
    </style>
    @if ($standalone)
    </head>
    <body>
    @endif
        <div class="letter-page">
            <div class="subject-date-row">
                <div class="subject-code">{{ $subjectCode }}</div>
                <div class="date-text">{{ $date }}</div>
            </div>

            <div class="document-body">
                <div class="recipients">
                    @foreach ($recipientLines as $recipientLine)
                        <span>{{ $recipientLine }}</span>@if (! $loop->last)<br>@endif
                    @endforeach
                </div>

                <div class="subject">{!! $titleHtml !!}</div>
                <div class="body">{!! $bodyHtml !!}</div>

                <div class="signature">
                    @if (!empty($signatureDataUri))
                        <img src="{{ $signatureDataUri }}" alt="Official signature" style="max-height: 52px; max-width: 180px; display: block; margin-bottom: 0.25cm; object-fit: contain;" />
                    @endif
                    @if (!empty($isDelegatedSignature) && !empty($delegatedPrefixLine))
                        <span>{{ $delegatedPrefixLine }}</span><br>
                    @endif
                    <span>{{ $signatoryName }}</span><br>
                    <span>{{ $designation }}</span><br>
                    <span>{{ $office }}</span>
                </div>
            </div>
        </div>
    @if ($standalone)
    </body>
    </html>
    @endif
@endif
