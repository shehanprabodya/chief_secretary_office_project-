import { useEffect, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import type { MeetingAttendee } from '../../types/meeting';

interface DecisionResponsibilityInputProps {
  attendees: MeetingAttendee[];
  selectedIds: number[];
  onChange: (selectedIds: number[]) => void;
}

const attendeeDetails = (attendee: MeetingAttendee) =>
  [attendee.designation, attendee.organization?.address].filter(Boolean).join(', ');

export default function DecisionResponsibilityInput({
  attendees,
  selectedIds,
  onChange,
}: DecisionResponsibilityInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const removeAttendee = (userId: number) => {
    onChange(selectedIds.filter((id) => id !== userId));
  };

  const addAttendee = (userId: number) => {
    if (selectedIds.includes(userId)) return;
    onChange([...selectedIds, userId]);
    setOpen(false);
    setSearch('');
  };

  const filteredAttendees = attendees.filter((attendee) =>
    [
      attendee.full_name,
      attendee.designation,
      attendee.organization?.organization_name,
      attendee.organization?.address,
    ]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="relative" ref={ref}>
      <div
        onClick={() => setOpen(true)}
        className="flex min-h-[44px] flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100"
      >
        {selectedIds.map((userId) => {
          const attendee = attendees.find((item) => item.user_id === userId);
          if (!attendee) return null;
          const details = attendeeDetails(attendee);
          return (
            <span
              key={userId}
              title={attendee.full_name}
              className="flex max-w-full items-center gap-1 rounded-md border border-slate-300 bg-slate-100 px-2 py-1 text-xs text-slate-700"
            >
              <span className="truncate">{details || 'No designation or address'}</span>
              <button
                type="button"
                aria-label={`Remove ${attendee.full_name}`}
                onClick={(event) => { event.stopPropagation(); removeAttendee(userId); }}
                className="shrink-0 text-slate-400 hover:text-slate-700"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
        >
          Add person...
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 max-h-72 w-72 max-w-[80vw] overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="sticky top-0 border-b border-slate-100 bg-white p-2">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search meeting attendees..."
              className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
            />
          </div>
          {filteredAttendees.filter((attendee) => !selectedIds.includes(attendee.user_id)).map((attendee) => (
            <button
              key={attendee.user_id}
              type="button"
              onClick={() => addAttendee(attendee.user_id)}
              className="flex w-full flex-col px-4 py-2 text-left text-sm text-slate-700 hover:bg-blue-50"
            >
              <span className="font-medium text-slate-900">{attendee.designation || attendee.full_name}</span>
              <span className="text-xs text-slate-400">
                {attendee.full_name}{attendee.organization?.organization_name ? ` · ${attendee.organization.organization_name}` : ''}
                {attendee.organization?.address ? ` · ${attendee.organization.address}` : ''}
              </span>
            </button>
          ))}
          {filteredAttendees.filter((attendee) => !selectedIds.includes(attendee.user_id)).length === 0 && (
            <p className="px-4 py-3 text-sm text-slate-400">
              {attendees.length === 0 ? 'No meeting attendees available.' : 'No matching attendees.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
