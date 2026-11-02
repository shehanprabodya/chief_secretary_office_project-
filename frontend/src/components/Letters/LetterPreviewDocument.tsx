import type { Letter } from '../../types/letter';
import { sanitizeDocumentHtml } from '../../utils/sanitizeHtml';

type LetterLike = Partial<Letter> & {
  your_ref?: string | null;
};

const stripReferenceTable = (html: string) => html.replace(
  /<table[^>]*class=["'][^"']*letterhead-meta[^"']*["'][^>]*>[\s\S]*?<\/table>/i,
  ''
);

const formatDateForDisplay = (value?: string | null) => {
  if (!value) return '';

  const trimmed = value.trim();
  if (!trimmed) return '';

  if (/^\d{4}[-./]\d{1,2}[-./]\d{1,2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.replace(/\./g, '-').split('-');
    if (year && month && day) {
      return `${year}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}`;
    }
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
};

const getReferenceCode = (letter?: LetterLike | null) => {
  const code = letter?.subject?.code ?? letter?.meeting_code ?? (letter as any)?.subject_code ?? '';
  return code?.trim() ?? '';
};

const getReferenceDate = (letter?: LetterLike | null) => formatDateForDisplay(letter?.signature_date ?? null);

export default function LetterPreviewDocument({ html, letter }: { html: string; letter?: LetterLike | null }) {
  const baseHtml = sanitizeDocumentHtml(stripReferenceTable(html || ''));
  const myRef = getReferenceCode(letter);
  const yourRef = (letter as any)?.your_ref ?? '';
  const dateValue = getReferenceDate(letter);

  return (
    <article className="mx-auto box-border bg-white text-slate-800 shadow-xl" style={{ width: '210mm', minHeight: '297mm', fontFamily: "'Iskoola Pota', sans-serif", fontSize: '12pt', lineHeight: 1.35 }}>
      <img src="/letterhead/letter_Header.png" alt="Official letterhead header" className="block w-full select-none" style={{ display: 'block' }} />

      <div className="border-y border-slate-800 bg-white px-[12mm] py-[3mm] text-[10pt] font-medium text-slate-800">
        <div className="grid grid-cols-3 gap-3">
          <div className="min-w-0 border-r border-slate-300 pr-3">
            <div className="text-[9pt] font-semibold uppercase tracking-wide text-slate-500">My Ref.</div>
            <div className="mt-1 break-words text-[10pt] font-semibold text-slate-800">{myRef || ' '}</div>
          </div>
          <div className="min-w-0 border-r border-slate-300 pr-3">
            <div className="text-[9pt] font-semibold uppercase tracking-wide text-slate-500">Your Ref.</div>
            <div className="mt-1 break-words text-[10pt] font-semibold text-slate-800">{yourRef || ' '}</div>
          </div>
          <div className="min-w-0">
            <div className="text-[9pt] font-semibold uppercase tracking-wide text-slate-500">Date</div>
            <div className="mt-1 break-words text-[10pt] font-semibold text-slate-800">{dateValue || ' '}</div>
          </div>
        </div>
      </div>

      <div className="px-[12mm] pb-[12mm] pt-[7mm]" style={{ minHeight: '170mm' }}>
        <div
          className="letter-body-content [&_p]:mb-[0.8em] [&_p]:leading-[1.6] [&_ul]:list-disc [&_ul]:pl-[1.5em] [&_ol]:list-decimal [&_ol]:pl-[1.5em] [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_th]:border [&_td]:p-1 [&_th]:p-1"
          dangerouslySetInnerHTML={{ __html: baseHtml }}
        />
      </div>

      <img src="/letterhead/letter_footer.png" alt="Official letterhead footer" className="block w-full select-none" style={{ display: 'block' }} />
    </article>
  );
}
