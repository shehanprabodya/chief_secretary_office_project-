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
            @page { size: 8.27in 11.69in; margin: 30mm 20mm 25mm 30mm; }
            html, body { margin: 0; padding: 0; }
            body { font-family: 'Iskoola Pota', 'Noto Sans Sinhala', 'DejaVu Sans', sans-serif; font-size: 10pt; line-height: 0.5; }
            .letter-page { width: 100%; box-sizing: border-box; }
            .letter-page, .letter-page * { font-family: 'Iskoola Pota', 'Noto Sans Sinhala', 'DejaVu Sans', sans-serif; font-size: 12pt; }
            .letter-page .subject, .letter-page .subject * { font-size: 13pt; }
          </style>
        </head>
        <body>${safeHtml}</body>
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
          width: 'min(calc(8.27in + 4rem), calc(100vw - 2rem))',
          height: 'min(calc(11.69in + 5rem), 95vh)',
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
        <div className="flex-1 overflow-auto bg-slate-200 p-4 sm:p-8">
          <div
            className="mx-auto shrink-0 box-border bg-white px-[20mm] pb-[25mm] pl-[30mm] pt-[30mm] shadow-xl"
            style={{
              width: '8.27in',
              minHeight: '11.69in',
              fontFamily: "'Iskoola Pota', 'Noto Sans Sinhala', 'DejaVu Sans', sans-serif",
              fontSize: '10pt',
              lineHeight: '0.5',
            }}
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        </div>
      </div>
    </div>
  );
}
