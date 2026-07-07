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
            body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.8; }
            .letter-page { width: 210mm; margin: 0 auto; padding: 25mm 20mm 20mm 30mm; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .header h1 { font-size: 14pt; font-weight: bold; margin: 0 0 4px 0; }
            .meta-row { display: flex; justify-content: space-between; margin-bottom: 16px; }
            .subject-line { font-weight: bold; text-decoration: underline; margin-bottom: 20px; }
            .content { text-align: justify; margin-bottom: 40px; }
            .signature-block { margin-top: 60px; }
            .signature-line { border-top: 1px solid #000; width: 200px; margin-bottom: 4px; }
            @media print { body { margin: 0; } }
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
            className="mx-auto min-h-[297mm] w-[210mm] bg-white p-[25mm] shadow-xl"
            style={{ paddingLeft: '30mm', paddingRight: '20mm', fontFamily: "'Times New Roman', serif", fontSize: '12pt', lineHeight: '1.8' }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
  );
}