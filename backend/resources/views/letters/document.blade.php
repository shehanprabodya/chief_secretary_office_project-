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

    <div class="subject" style="margin-bottom: 0.5cm;">
        {!! $titleHtml !!}
    </div>

    <div class="body" style="text-align: justify; text-align-last: left;">
        {!! $bodyHtml !!}
    </div>

    <div class="signature" style="margin-top: 0.5cm;">

        @if (!empty($signatureDataUri))
            <img
                src="{{ $signatureDataUri }}"
                alt="Official signature"
                style="max-height: 52px; max-width: 180px; display: block; margin-bottom: 0.25cm; object-fit: contain;"
            />
        @endif

        <span>{{ $signatoryName }}</span><br>
        <span>{{ $designation }}</span><br>

        @if (!empty($isDelegatedSignature) && !empty($delegatedPrefixLine))
            <span>{{ $delegatedPrefixLine }}</span><br>
        @endif

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

        /* Main A4 page */

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
            overflow: hidden;
        }

        .letter-page * {
            box-sizing: border-box;
            font-family: "Iskoola Pota", sans-serif !important;
            font-size: 12pt;
            line-height: 1.3;
            letter-spacing: normal;
            word-spacing: normal;
        }

        /* Normal letter reference and date */

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

        /* Document content */

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

        /* Subject */

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

        /* Letter body */

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

        /* Signature */

        .signature {
            margin-top: 18pt;
            line-height: 1.3;
            color: #000;
        }

        /* =====================================================
           EMAIL-ONLY OFFICIAL LETTERHEAD LAYOUT
           This section is enabled only when $emailLetterhead
           is true. Normal PDF downloads remain unchanged.
        ====================================================== */

        @if ($emailLetterhead ?? false)

            /* Official header */

            .letter-header {
                position: absolute;
                top: 2.5mm;
                left: 19mm;
                width: 175mm;
                height: 50mm;
            }

            .letter-header img,
            .letter-footer img {
                display: block;
                width: 100%;
                height: 100%;
                object-fit: contain;
                object-position: center;
            }

            /* Reference section */

            .letter-reference {
                position: absolute;
                top: 53mm;
                left: 19mm;
                width: 175mm;
                height: 16mm;
                background: #fff;
                border-top: 1px solid rgba(15, 23, 42, 0.7);
                border-bottom: 1px solid rgba(15, 23, 42, 0.7);
            }

            .reference-grid {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                width: 100%;
                height: 100%;
                align-items: center;
            }

            .reference-column {
                display: flex;
                flex-direction: column;
                justify-content: center;
                min-width: 0;
                padding: 0.8mm 3mm 0.7mm;
                text-align: left;
            }

            .reference-column + .reference-column {
                border-left: 1px solid rgba(15, 23, 42, 0.2);
            }

            .reference-inline-row {
                display: flex;
                align-items: center;
                gap: 2mm;
                width: 100%;
            }

            .reference-labels-wrap {
                display: flex;
                align-items: flex-start;
                gap: 1mm;
                min-width: 0;
            }

            .reference-labels {
                display: flex;
                flex-direction: column;
                gap: 0.25mm;
                font-size: 7pt !important;
                line-height: 1.15;
                font-weight: 700;
                white-space: nowrap;
            }

            .reference-brace {
                font-size: 18pt !important;
                line-height: 1;
                font-weight: 700;
            }

            .reference-value {
                font-size: 9pt !important;
                line-height: 1.2;
                font-weight: 700;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            /* Hide normal reference row */

            .subject-date-row {
                display: none;
            }

            /* Email letter content positioning */

            .document-body {
                position: absolute;
                top: 71mm;
                left: 19mm;
                right: 16mm;
                bottom: 44mm;
                width: auto;
                max-width: none;
                overflow: visible;
            }

            /* Official footer */

            .letter-footer {
                position: absolute;
                top: 255mm;
                left: 19mm;
                width: 175mm;
                height: 25mm;
            }

        @endif

    </style>

    @if ($standalone)
    </head>
    <body>
    @endif

        <div class="letter-page">

            {{-- ==========================================
                 EMAIL-ONLY OFFICIAL HEADER
            =========================================== --}}

            @if ($emailLetterhead ?? false)

                <div class="letter-header">
                    @if (!empty($emailHeaderDataUri))
                        <img
                            src="{{ $emailHeaderDataUri }}"
                            alt="Official letterhead header"
                        />
                    @endif
                </div>

                {{-- Official reference section --}}

                <div class="letter-reference">

                    <div class="reference-grid">

                        {{-- My Reference --}}

                        <div class="reference-column">

                            <div class="reference-inline-row">

                                <div class="reference-labels-wrap">

                                    <div class="reference-labels">
                                        <span>මගේ අංකය</span>
                                        <span>எனது இல.</span>
                                        <span>My Ref.</span>
                                    </div>

                                    <span class="reference-brace">}</span>

                                </div>

                                <div class="reference-value">
                                    {{ $subjectCode ?? '' }}
                                </div>

                            </div>

                        </div>

                        {{-- Your Reference --}}

                        <div class="reference-column">

                            <div class="reference-inline-row">

                                <div class="reference-labels-wrap">

                                    <div class="reference-labels">
                                        <span>ඔබගේ අංකය</span>
                                        <span>உமது இல.</span>
                                        <span>Your Ref.</span>
                                    </div>

                                    <span class="reference-brace">}</span>

                                </div>

                                <div class="reference-value">
                                    {{ $yourRef ?? '' }}
                                </div>

                            </div>

                        </div>

                        {{-- Date --}}

                        <div class="reference-column">

                            <div class="reference-inline-row">

                                <div class="reference-labels-wrap">

                                    <div class="reference-labels">
                                        <span>දිනය</span>
                                        <span>திகதி</span>
                                        <span>Date</span>
                                    </div>

                                    <span class="reference-brace">}</span>

                                </div>

                                <div class="reference-value">
                                    {{ $date ?? '' }}
                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            @endif

            {{-- ==========================================
                 NORMAL REFERENCE ROW
                 Used only for normal PDF downloads.
            =========================================== --}}

            <div class="subject-date-row">

                <div class="subject-code">
                    {{ $subjectCode }}
                </div>

                <div class="date-text">
                    {{ $date }}
                </div>

            </div>

            {{-- ==========================================
                 DOCUMENT CONTENT
            =========================================== --}}

            <div class="document-body">

                {{-- Recipients --}}

                <div class="recipients">

                    @foreach ($recipientLines as $recipientLine)
                        <span>{{ $recipientLine }}</span>@if (! $loop->last)<br>@endif
                    @endforeach

                </div>

                {{-- Subject --}}

                <div class="subject">
                    {!! $titleHtml !!}
                </div>

                {{-- Letter body --}}

                <div class="body">
                    {!! $bodyHtml !!}
                </div>

                {{-- ======================================
                     SIGNATURE SECTION
                     Preserves normal and delegated signing.
                ======================================= --}}

                <div class="signature">

                    @if (!empty($signatureDataUri))

                        <img
                            src="{{ $signatureDataUri }}"
                            alt="Official signature"
                            style="
                                max-height: 52px;
                                max-width: 180px;
                                display: block;
                                margin-bottom: 0.25cm;
                                object-fit: contain;
                            "
                        />

                    @endif

                    <span>{{ $signatoryName }}</span><br>

                    <span>{{ $designation }}</span><br>

                    @if (!empty($isDelegatedSignature) && !empty($delegatedPrefixLine))

                        <span>{{ $delegatedPrefixLine }}</span><br>

                    @endif

                    <span>{{ $office }}</span>

                </div>

            </div>

            {{-- ==========================================
                 EMAIL-ONLY OFFICIAL FOOTER
            =========================================== --}}

            @if ($emailLetterhead ?? false)

                <div class="letter-footer">

                    @if (!empty($emailFooterDataUri))

                        <img
                            src="{{ $emailFooterDataUri }}"
                            alt="Official letterhead footer"
                        />

                    @endif

                </div>

            @endif

        </div>

    @if ($standalone)
    </body>
    </html>
    @endif

@endif