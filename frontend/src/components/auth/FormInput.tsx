import type { ReactNode } from "react";

interface Props {
  label: string;
  type?: string;
  placeholder?: string;
  icon?: ReactNode;
}

export default function FormInput({
  label,
  type = "text",
  placeholder,
  icon,
}: Props) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">
        {label}
      </label>

      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            {icon}
          </div>
        )}

        <input
          type={type}
          placeholder={placeholder}
          className="
            w-full
            rounded-md
            border
            border-slate-300
            py-3
            pl-11
            pr-4
            focus:outline-none
            focus:ring-2
            focus:ring-blue-500
          "
        />
      </div>
    </div>
  );
}