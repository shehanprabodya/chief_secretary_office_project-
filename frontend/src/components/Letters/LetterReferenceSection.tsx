import type { Letter } from '../../types/letter';

type LetterLike = Partial<Letter> & {
  your_ref?: string | null;
  subject_code?: string | null;
  date?: string | null;
};

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
  const code =
    letter?.subject?.code ??
    letter?.meeting_code ??
    letter?.subject_code ??
    (letter as any)?.reference_code ??
    '';

  return code?.trim() ?? '';
};

const getReferenceDate = (letter?: LetterLike | null) =>
  formatDateForDisplay(letter?.signature_date ?? letter?.date ?? (letter as any)?.letter_date ?? null);

export default function LetterReferenceSection({ letter }: { letter?: LetterLike | null }) {
  const myRef = getReferenceCode(letter);
  const yourRef = (letter as any)?.your_ref ?? '';
  const dateValue = getReferenceDate(letter);

  return (
    <div className="letter-reference">
      <div className="reference-grid">
        <div className="reference-column">
          <div className="reference-inline-row">
            <div className="reference-labels-wrap">
              <div className="reference-labels">
                <span>මගේ අංකය</span>
                <span>எனது இல.</span>
                <span>My Ref.</span>
              </div>
              <span className="reference-brace">&#125;</span>
            </div>
            <div className="reference-value-row">
              <span className="reference-value">{myRef || ' '}</span>
            </div>
          </div>
        </div>

        <div className="reference-column">
          <div className="reference-inline-row">
            <div className="reference-labels-wrap">
              <div className="reference-labels">
                <span>ඔබගේ අංකය</span>
                <span>உமது இல.</span>
                <span>Your Ref.</span>
              </div>
              <span className="reference-brace">&#125;</span>
            </div>
            <div className="reference-value-row">
              <span className="reference-value">{yourRef || ' '}</span>
            </div>
          </div>
        </div>

        <div className="reference-column">
          <div className="reference-inline-row">
            <div className="reference-labels-wrap">
              <div className="reference-labels">
                <span>දිනය</span>
                <span>திகதி</span>
                <span>Date</span>
              </div>
              <span className="reference-brace">&#125;</span>
            </div>
            <div className="reference-value-row">
              <span className="reference-value">{dateValue || ' '}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
