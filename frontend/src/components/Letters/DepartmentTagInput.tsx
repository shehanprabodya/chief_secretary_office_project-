import { useState } from 'react';
import { X } from 'lucide-react';

interface Department {
  department_id: number;
  department_name: string;
}

interface DepartmentTagInputProps {
  allDepartments: Department[];
  selected: Department[];
  onChange: (departments: Department[]) => void;
}

export default function DepartmentTagInput({ allDepartments, selected, onChange }: DepartmentTagInputProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  const available = allDepartments.filter(
    (d) => !selected.some((s) => s.department_id === d.department_id)
  );

  const addDepartment = (dept: Department) => {
    onChange([...selected, dept]);
    setShowDropdown(false);
  };

  const removeDepartment = (id: number) => {
    onChange(selected.filter((d) => d.department_id !== id));
  };

  return (
    <div className="relative flex flex-wrap items-center gap-2 rounded-lg border border-slate-300 p-2.5">
      {selected.map((dept) => (
        <span
          key={dept.department_id}
          className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700"
        >
          {dept.department_name}
          <button onClick={() => removeDepartment(dept.department_id)}>
            <X className="h-3.5 w-3.5 hover:text-blue-900" />
          </button>
        </span>
      ))}

      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="text-sm text-slate-400 hover:text-slate-600"
        >
          + Add department...
        </button>

        {showDropdown && available.length > 0 && (
          <div className="absolute left-0 top-full z-10 mt-1 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            {available.map((dept) => (
              <button
                key={dept.department_id}
                onClick={() => addDepartment(dept)}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                {dept.department_name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}