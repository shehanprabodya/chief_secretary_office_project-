import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import type { Organization, ExternalOfficer, RecipientTag } from '../../types/letter';

interface RecipientTagInputProps {
  organizations: Organization[];
  recipients: RecipientTag[];
  onChange: (recipients: RecipientTag[]) => void;
}

export default function RecipientTagInput({ organizations, recipients, onChange }: RecipientTagInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const addOfficer = (officer: ExternalOfficer, org: Organization) => {
    const label = `${officer.designation}, ${org.organization_name}`;
    const alreadyAdded = recipients.some((r) => r.user_id === officer.user_id);
    if (alreadyAdded) return;

    onChange([
      ...recipients,
      {
        id: `user-${officer.user_id}`,
        user_id: officer.user_id,
        organization_id: org.organization_id,
        recipient_label: label,
        designation: officer.designation,
        organization_name: org.organization_name,
      },
    ]);
    setOpen(false);
    setSearch('');
  };

  const addOrg = (org: Organization) => {
    const alreadyAdded = recipients.some((r) => r.organization_id === org.organization_id && !r.user_id);
    if (alreadyAdded) return;

    onChange([
      ...recipients,
      {
        id: `org-${org.organization_id}`,
        organization_id: org.organization_id,
        recipient_label: org.organization_name,
        organization_name: org.organization_name,
      },
    ]);
    setOpen(false);
    setSearch('');
  };

  const removeRecipient = (id: string) => {
    onChange(recipients.filter((r) => r.id !== id));
  };

  const filteredOrgs = organizations.filter(
    (org) =>
      org.organization_name.toLowerCase().includes(search.toLowerCase()) ||
      org.officers?.some(
        (o) =>
          o.full_name.toLowerCase().includes(search.toLowerCase()) ||
          o.designation.toLowerCase().includes(search.toLowerCase())
      )
  );

  return (
    <div className="relative" ref={ref}>
      {/* Tag container */}
      <div
        onClick={() => setOpen(true)}
        className="flex min-h-[44px] flex-wrap items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 cursor-text focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20"
      >
        {recipients.map((r) => (
          <span
            key={r.id}
            className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-slate-100 px-2.5 py-1 text-sm text-slate-800"
          >
            {r.recipient_label}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeRecipient(r.id); }}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600"
        >
          Add department...
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-full max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="sticky top-0 border-b border-slate-100 bg-white p-2">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search organization or officer..."
              className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>

          {filteredOrgs.map((org) => (
            <div key={org.organization_id}>
              {/* Organization level */}
              <button
                type="button"
                onClick={() => addOrg(org)}
                className="flex w-full items-center justify-between px-4 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                <span>{org.organization_name}</span>
                <span className="text-xs font-normal text-slate-400">{org.abbreviation}</span>
              </button>

              {/* Officer level — "designation, org name" */}
              {org.officers?.map((officer) => (
                <button
                  key={officer.user_id}
                  type="button"
                  onClick={() => addOfficer(officer, org)}
                  className="flex w-full flex-col px-6 py-2 text-left text-sm text-slate-700 hover:bg-blue-50"
                >
                  <span className="font-medium text-slate-900">{officer.designation}</span>
                  <span className="text-xs text-slate-400">{officer.full_name} · {org.organization_name}</span>
                </button>
              ))}
            </div>
          ))}

          {filteredOrgs.length === 0 && (
            <p className="px-4 py-3 text-sm text-slate-400">No results found</p>
          )}
        </div>
      )}
    </div>
  );
}