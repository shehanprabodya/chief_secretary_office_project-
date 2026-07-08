import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  List, Grid3x3, Plus,
  Eye, Funnel
} from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import PreviewModal from '../components/Letters/PreviewModal';
import { letterService } from '../services/letterService';
import type { Letter, Subject } from '../types/letter';

const STATUS_BADGE: Record<string, { label: string; className: string; dotClassName: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-slate-100 text-slate-600',
    dotClassName: 'bg-slate-400',
  },
  pending_approval: {
    label: 'Pending',
    className: 'bg-orange-50 text-orange-700',
    dotClassName: 'bg-orange-500',
  },
  approved: {
    label: 'Approved',
    className: 'bg-green-50 text-green-700',
    dotClassName: 'bg-green-500',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-50 text-red-700',
    dotClassName: 'bg-red-500',
  },
  dispatched: {
    label: 'Dispatched',
    className: 'bg-blue-50 text-blue-700',
    dotClassName: 'bg-blue-500',
  },
};

export default function MeetingsPage() {
  const navigate = useNavigate();
  const [letters, setLetters] = useState<Letter[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectTitle, setSubjectTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLetterId, setPreviewLetterId] = useState<number | null>(null);

  const loadLetters = useCallback(async () => {
    setIsLoading(true);
    try {
      const letters = await letterService.getMyLetters();
      setLetters(letters);
    } catch (err) {
      console.error('Failed to fetch letters:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLetters();
  }, [loadLetters]);

  useEffect(() => {
    letterService.getSubjects()
      .then(setSubjects)
      .catch((err) => console.error('Failed to fetch subjects:', err));
  }, []);

  const filteredLetters = useMemo(() => {
    const code = subjectCode.trim().toLowerCase();
    const titleFilter = subjectTitle.trim().toLowerCase();

    return letters.filter((letter) => {
      const letterDate = (letter.signature_date || letter.created_at || '').slice(0, 10);
      const letterCode = (letter.subject?.code || letter.meeting_code || '').toLowerCase();
      const letterSubjectTitle = (letter.subject?.title || '').toLowerCase();
      const matchesCode = !code || letterCode === code;
      const matchesTitle = !titleFilter || letterSubjectTitle === titleFilter;
      const matchesStart = !startDate || !letterDate || letterDate >= startDate;
      const matchesEnd = !endDate || !letterDate || letterDate <= endDate;

      return matchesCode && matchesTitle && matchesStart && matchesEnd;
    });
  }, [letters, subjectCode, subjectTitle, startDate, endDate]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  };

  const formatLetterTitle = (title?: string) => {
    if (!title) return 'Untitled draft letter';

    const document = new DOMParser().parseFromString(title, 'text/html');
    return document.body.textContent?.trim() || 'Untitled draft letter';
  };

  const handleViewLetter = async (letterId: number) => {
    try {
      const result = await letterService.preview(letterId);
      setPreviewHtml(result.preview_html);
      setPreviewLetterId(letterId);
    } catch (err) {
      console.error('Failed to preview letter:', err);
      alert('Failed to preview letter');
    }
  };

  return (
    <DashboardLayout pageTitle="Meeting Management">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Meeting Management</h1>
          <div className="flex items-center gap-3">
            <div className="flex  border border-slate-300 bg-white">
              <button className="flex items-center gap-2  bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                <List className="h-4 w-4" />
                List
              </button>
              <button className="flex items-center gap-2  px-4 py-2 text-sm font-medium text-slate-900 bg-slate-100 hover:bg-slate-400">
                <Grid3x3 className="h-4 w-4" />
                Calendar
              </button>
            </div>
            <button
              onClick={() => navigate('/letters/new')}
              className="flex items-center gap-2 bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-500"
            >
              <Plus className="h-4 w-4" />
              Generate Letter
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className=" rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Subject Code</label>
              <select
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">All Subject Codes</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.code}>
                    {subject.code}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Subject Title</label>
              <select
                value={subjectTitle}
                onChange={(e) => setSubjectTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">All Subject Titles</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.title}>
                    {subject.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">From Date / To Date</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                <span className="text-slate-400">/</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={loadLetters}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-500 text-sm font-medium text-white hover:bg-blue-800"
              >
               <Funnel className='h-4 w-4 shrink-0' />
                Apply Filters
              </button>
            </div>
          </div>
        </div>

        {/* Search Results */}
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-6 py-3">Letter Title</th>
                <th className="px-6 py-3">Subject Code</th>
                <th className="px-6 py-3">Subject Title</th>
                <th className="px-6 py-3">Letter Date</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                    Loading letters...
                  </td>
                </tr>
              ) : filteredLetters.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                    No letters found for the selected filters.
                  </td>
                </tr>
              ) : (
                filteredLetters.map((letter) => (
                  <tr
                    key={letter.letter_id}
                    className="hover:bg-blue-50/60"
                  >
                    <td className="px-6 py-4">
                      <p className="font-semibold text-blue-700 hover:underline">{formatLetterTitle(letter.title)}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {letter.subject?.code || letter.meeting_code || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <p className="max-w-72 truncate text-sm text-slate-700">{letter.subject?.title || '—'}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {letter.signature_date ? formatDate(letter.signature_date) : 'Not set'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[letter.status]?.className ?? 'bg-slate-100 text-slate-600'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_BADGE[letter.status]?.dotClassName ?? 'bg-slate-400'}`} />
                        {STATUS_BADGE[letter.status]?.label ?? letter.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleViewLetter(letter.letter_id);
                          }}
                          className="rounded p-1.5 text-blue-600 hover:bg-blue-50 hover:text-blue-800"
                          title="View letter preview"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="flex items-center justify-between bg-slate-100 border-t border-slate-200 px-6 py-3">
            <p className="text-sm text-slate-500">
              Showing {filteredLetters.length} letters
            </p>
            <p className="text-xs text-slate-400">Click a row to open the letter.</p>
          </div>
        </div>
      </div>
      {previewLetterId && (
        <PreviewModal
          html={previewHtml}
          letterId={previewLetterId}
          onClose={() => {
            setPreviewLetterId(null);
            setPreviewHtml('');
          }}
        />
      )}
    </DashboardLayout>
  );
}
