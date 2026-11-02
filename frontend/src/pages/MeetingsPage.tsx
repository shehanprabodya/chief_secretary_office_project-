import { useState, useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  List, Grid3x3, Plus,
  Eye, ClipboardCheck, FileText, X, Download, Pencil
} from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import PreviewModal from '../components/Letters/PreviewModal';
import { useAuth } from '../context/AuthContext';
import { letterService } from '../services/letterService';
import { minuteService } from '../services/minuteService';
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

//const LETTERS_PER_PAGE = 10;

export default function MeetingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [letters, setLetters] = useState<Letter[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalLetters, setTotalLetters] = useState(0);
  const [fromLetter, setFromLetter] = useState<number | null>(null);
  const [toLetter, setToLetter] = useState<number | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectTitle, setSubjectTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLetter, setPreviewLetter] = useState<Letter | null>(null);
  const [previewLetterId, setPreviewLetterId] = useState<number | null>(null);
  const [minutePreviewUrl, setMinutePreviewUrl] = useState('');
  const [minutePreviewMeetingId, setMinutePreviewMeetingId] = useState<number | null>(null);
  const [minutePreviewCreatorId, setMinutePreviewCreatorId] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      if (minutePreviewUrl) {
        URL.revokeObjectURL(minutePreviewUrl);
      }
    };
  }, [minutePreviewUrl]);
  

 useEffect(() => {
  let cancelled = false;

  const fetchLetters = async () => {
    try {
      const response = await letterService.getMyLetters({
        page: currentPage,
        subject_code: subjectCode,
        subject_title: subjectTitle,
        start_date: startDate,
        end_date: endDate,
      });

      if (cancelled) return;

      setLetters(response.data);
      setCurrentPage(response.current_page);
      setLastPage(response.last_page);
      setTotalLetters(response.total);
      setFromLetter(response.from);
      setToLetter(response.to);
      setIsLoading(false);
    } catch (error) {
      if (cancelled) return;

      console.error('Failed to load letters:', error);
      setIsLoading(false);
    }
  };

  fetchLetters();

  return () => {
    cancelled = true;
  };
}, [
  currentPage,
  subjectCode,
  subjectTitle,
  startDate,
  endDate,
]);

  useEffect(() => {
    letterService.getSubjects()
      .then(setSubjects)
      .catch((err) => console.error('Failed to fetch subjects:', err));
  }, []);

  

  

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
      setPreviewLetter(result.letter);
      setPreviewLetterId(letterId);
    } catch (err) {
      console.error('Failed to preview letter:', err);
      alert('Failed to preview letter');
    }
  };

  const handlePreviewMinute = async (letter: Letter) => {
    if (!letter.meeting_id) {
      alert('No meeting is linked to this letter yet.');
      return;
    }

    try {
      const meetingId = letter.meeting_id;
      const { minute } = await minuteService.getOrCreateForMeeting(meetingId);
      const blob = await minuteService.downloadPdf(minute.minute_id);
      const url = URL.createObjectURL(blob);
      setMinutePreviewUrl((currentUrl) => {
        if (currentUrl) {
          URL.revokeObjectURL(currentUrl);
        }
        return url;
      });
      setMinutePreviewMeetingId(meetingId);
      setMinutePreviewCreatorId(minute.created_by ?? null);
    } catch (err) {
      console.error('Failed to preview minute:', err);
      alert('Failed to preview the officer-created minute.');
    }
  };

  const closeMinutePreview = () => {
    if (minutePreviewUrl) {
      URL.revokeObjectURL(minutePreviewUrl);
    }
    setMinutePreviewUrl('');
    setMinutePreviewMeetingId(null);
    setMinutePreviewCreatorId(null);
  };

  const canEditMinute = Number(user?.id) === minutePreviewCreatorId;

  const handleDownloadMinute = () => {
    if (!minutePreviewUrl) return;

    const link = document.createElement('a');
    link.href = minutePreviewUrl;
    link.download = `meeting-minutes-${minutePreviewMeetingId ?? 'preview'}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
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
              onClick={() => navigate('/meetings/new')}
              className="flex items-center gap-2 bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-500"
            >
              <Plus className="h-4 w-4" />
              Generate Letter
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className=" rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Subject Code</label>
              <select
                value={subjectCode}
                onChange={(e) => {
                  setSubjectCode(e.target.value);
                  setCurrentPage(1);
                }}
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
                onChange={(e) => {
                  setSubjectTitle(e.target.value);
                  setCurrentPage(1);
                }}
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
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                <span className="text-slate-400">/</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

          </div>
        </div>

        {/* Search Results */}
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-6 py-3">Letter Title</th>
                <th className="px-6 py-3">Subject Title</th>
                <th className="px-6 py-3">Letter Date</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-center">Minutes</th>
                <th className="px-6 py-3 text-center">Attendance</th>
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
              ) : letters.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                    No letters found for the selected filters.
                  </td>
                </tr>
              ) : (
                letters.map((letter) => (
                  <tr
                    key={letter.letter_id}
                    className="hover:bg-blue-50/60"
                  >
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => navigate(letter.meeting_id
                          ? `/meetings/${letter.meeting_id}?letter_id=${letter.letter_id}`
                          : `/letters/${letter.letter_id}`)}
                        className="text-left font-semibold text-blue-700 hover:underline"
                      >
                        {formatLetterTitle(letter.title)}
                      </button>
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
                    <td className="px-6 py-4 text-center">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handlePreviewMinute(letter);
                        }}
                        className="rounded p-1.5 text-violet-600 hover:bg-violet-50 hover:text-violet-800"
                        title="Preview meeting minutes"
                        aria-label="Preview minutes"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {Number(user?.id) === letter.created_by ? (
                        <button
                          type="button"
                          disabled={letter.status !== 'approved'}
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/attendance?letter_id=${letter.letter_id}`);
                          }}
                          className="rounded p-1.5 text-green-600 hover:bg-green-50 hover:text-green-800 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                          title={
                            letter.status === 'approved'
                              ? 'Edit participant attendance'
                              : 'Attendance editing opens after this meeting letter is approved'
                          }
                        >
                          <ClipboardCheck className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="cursor-not-allowed rounded p-1.5 text-slate-300"
                          title="Only the meeting letter creator can edit attendance"
                          aria-label="Attendance editing is available only to the meeting letter creator"
                        >
                          <ClipboardCheck className="h-4 w-4" />
                        </button>
                      )}
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
                 Showing {fromLetter ?? 0}
                  -
                  {toLetter ?? 0}
                  of {totalLetters} letters
            </p>
            <div className="flex items-center gap-2">
              <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                  disabled={currentPage === 1}
                  className="rounded border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-white"
                >
                  Previous
              </button>
              {Array.from({ length: lastPage },(_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`h-8 min-w-8 rounded border px-2 text-xs font-semibold ${
                    page === currentPage
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.min(lastPage, page + 1)
                    )
                  }
                  disabled={currentPage === lastPage}
                  className="rounded border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-white"
                >
                  Next
              </button>
            </div>
          </div>
        </div>
      </div>
      {previewLetterId && (
        <PreviewModal
          html={previewHtml}
          letterId={previewLetterId}
          letter={previewLetter ?? undefined}
          onClose={() => {
            setPreviewLetterId(null);
            setPreviewLetter(null);
            setPreviewHtml('');
          }}
        />
      )}

      {minutePreviewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Meeting Minutes Preview</h2>
                <p className="text-sm text-slate-500">Officer-created meeting minutes</p>
              </div>
              <button
                type="button"
                onClick={closeMinutePreview}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
                Close
              </button>
            </div>

            <div className="flex-1 overflow-hidden bg-slate-100 p-2">
              <iframe
                src={minutePreviewUrl}
                title="Meeting Minutes Preview"
                className="h-full w-full rounded-xl border-0 bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-4 py-3">
              <button
                type="button"
                onClick={handleDownloadMinute}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
              <button
                type="button"
                disabled={!canEditMinute}
                onClick={() => {
                  if (minutePreviewMeetingId) {
                    closeMinutePreview();
                    navigate(`/meetings/${minutePreviewMeetingId}/minutes`);
                  }
                }}
                title={canEditMinute ? 'Edit this minute' : 'Only the officer who created this minute can edit it'}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${canEditMinute ? 'bg-blue-700 text-white hover:bg-blue-800' : 'cursor-not-allowed bg-slate-200 text-slate-500'}`}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
