import type { Letter } from '../../types/letter';
import { sanitizeDocumentHtml } from '../../utils/sanitizeHtml';
import LetterReferenceSection from './LetterReferenceSection';
import './letter-preview.css';

type LetterLike = Partial<Letter> & {
  your_ref?: string | null;
};

const stripReferenceTable = (html: string) => html.replace(
  /<table[^>]*class=["'][^"']*letterhead-meta[^"']*["'][^>]*>[\s\S]*?<\/table>/i,
  ''
);

export default function LetterPreviewDocument({ html, letter }: { html: string; letter?: LetterLike | null }) {
  const baseHtml = sanitizeDocumentHtml(stripReferenceTable(html || ''));

  return (
    <article className="a4-letter-page" aria-label="Government letter preview">
      <div className="letter-header">
        <img src="/letterhead/letter_Header.png" alt="Official letterhead header" />
      </div>

      <LetterReferenceSection letter={letter} />

      <div className="letter-content-area">
        <div
          className="letter-body-content"
          dangerouslySetInnerHTML={{ __html: baseHtml || '<p></p>' }}
        />
      </div>

      <div className="letter-footer">
        <img src="/letterhead/letter_footer.png" alt="Official letterhead footer" />
      </div>
    </article>
  );
}
