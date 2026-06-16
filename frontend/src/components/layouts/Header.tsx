import { Bell, UserCircle } from "lucide-react";

export default function Header() {
  return (
    <header className="h-16 bg-[#012554] border-b border-white/10">
      <div className="h-full px-8 flex items-center justify-between">

        <div
          className="
            w-10 h-10
            rounded-lg
            bg-[#F4C400]
            flex items-center justify-center
          "
        >
          🏛️
        </div>

        <div className="flex items-center gap-6 text-white">

          <button className="font-semibold border-b">
            English
          </button>

          <Bell size={20} />

          <UserCircle size={22} />
        </div>
      </div>
    </header>
  );
}