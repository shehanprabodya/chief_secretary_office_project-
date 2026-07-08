import { X, Download, Printer } from 'lucide-react';
import { letterService } from '../../services/letterService';

interface PreviewModalProps {
  html: string;
  letterId: number;
  onClose: () => void;
}

export default function PreviewModal({ html, letterId, onClose }: PreviewModalProps) {
  const handleDownloadPdf = async () => {
    await letterService.downloadPdf(letterId);
  };

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Letter</title>
          <style>
            @page { size: A4 portrait; margin: 30mm 20mm 25mm 30mm; }
            html, body { margin: 0; padding: 0; }
            body { font-family: 'DejaVu Sans', sans-serif; font-size: 12pt; line-height: 1.75; }
            .letter-page { width: 100%; box-sizing: border-box; }
          </style>
        </head>
        <body>${html}</body>
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
      <div className="relative z-10 flex h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Letter Preview</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" /> Download PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Printer className="h-4 w-4" /> Print
            </button>
            <button onClick={onClose} className="rounded-full p-1.5 hover:bg-slate-100">
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto bg-slate-200 p-8">
          <div
            className="mx-auto min-h-[297mm] w-[210mm] box-border bg-white px-[20mm] pb-[25mm] pl-[30mm] pt-[30mm] shadow-xl"
            style={{ fontFamily: "'DejaVu Sans', sans-serif", fontSize: '12pt', lineHeight: '1.75' }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
  );
}
