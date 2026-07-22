import { X, Download, Printer, FileText } from 'lucide-react';
import { letterService } from '../../services/letterService';
import { sanitizeDocumentHtml } from '../../utils/sanitizeHtml';

interface PreviewModalProps {
  html: string;
  letterId: number;
  onClose: () => void;
  allowExports?: boolean;
}

export default function PreviewModal({ html, letterId, onClose, allowExports = true }: PreviewModalProps) {
  const safeHtml = sanitizeDocumentHtml(html);
  const previewHtml = `
    <style>
      .letter-page .recipients,
      .letter-page .recipients *,
      .letter-page .body,
      .letter-page .body *,
      .letter-page .signature,
      .letter-page .signature * {
        font-size: 12pt !important;
      }

      .letter-page .subject,
      .letter-page .subject * {
        font-size: 13pt !important;
      }
    </style>
    ${safeHtml}
    <style>
      /* Counter the 125% screen zoom for fixed header coordinates. These
         values keep the visible subject and date at 1.5in and 6.5in. */
      .letter-page .letterhead-spacer {
        width: 20.5mm !important;
      }

      .letter-page .letterhead-subject-column {
        width: 101.6mm !important;
      }

      .letter-page .letterhead-date-column {
        width: 61.1mm !important;
      }
    </style>
  `;

  const handleDownloadPdf = async () => {
    await letterService.downloadPdf(letterId);
  };

  const handleDownloadDocx = async () => {
    await letterService.downloadDocx(letterId);
  };

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Letter</title>
          <style>
            @font-face {
              font-family: 'Iskoola Pota';
              src: url('/fonts/Iskoola Pota Regular.ttf') format('truetype');
              font-style: normal;
              font-weight: 400;
            }
            @page { size: 8in 297mm; margin: 10mm; }
            html, body { margin: 0; padding: 0; }
            body { font-family: 'Iskoola Pota', 'Noto Sans Sinhala', 'DejaVu Sans', sans-serif; font-size: 12pt; }
            .letter-page { width: 100%; box-sizing: border-box; }
            .letter-page, .letter-page * { letter-spacing: normal; word-spacing: -1.5pt; }
            .letter-page .body, .letter-page .body * { word-spacing: -1.5pt !important; }
          </style>
        </head>
        <body>${previewHtml}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-10 flex w-full flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        style={{
          width: 'min(96rem, calc(100vw - 2rem))',
          height: 'min(calc(297mm + 5rem), 95vh)',
        }}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
          <h2 className="text-lg font-bold text-slate-900">Letter Preview</h2>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            {allowExports && (
              <>
                <button
                  onClick={handleDownloadPdf}
                  className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" /> Download PDF
                </button>
                <button
                  onClick={handleDownloadDocx}
                  className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <FileText className="h-4 w-4" /> Download DOCX
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Printer className="h-4 w-4" /> Print
                </button>
              </>
            )}
            <button onClick={onClose} className="rounded-full p-1.5 hover:bg-slate-100">
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto bg-slate-200 p-1 sm:p-2">
          <div
            className="mx-auto shrink-0 box-border bg-white p-[10mm] shadow-xl"
            style={{
              width: '8in',
              minHeight: '297mm',
              zoom: 1.25,
              fontFamily: "'Iskoola Pota', 'Noto Sans Sinhala', 'DejaVu Sans', sans-serif",
              fontSize: '12pt',
            }}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      </div>
    </div>
  );
}
