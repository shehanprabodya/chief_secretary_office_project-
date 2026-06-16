import { Bell, Globe, UserCircle } from "lucide-react";
import { useState } from "react";

export default function Header() {
  const [language, setLanguage] = useState<"si" | "en">("en");

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-white/10 bg-[var(--color-primary)]">
      <div className="page-container flex h-full flex-row items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img
            src="logo.svg"
            alt="MMCS Logo"
            className="h-10 w-10 object-contain"
          />

          <div className="hidden sm:block">
            <h1 className=" text-white text-lg font-bold tracking-wide">
              Meeting Management and coordination System
            </h1>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3 text-white">
          {/* Language Switcher */}
          <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2">
            <Globe size={16} />

            <button
              onClick={() => setLanguage("si")}
              className={`text-sm transition ${
                language === "si"
                  ? "font-semibold text-white"
                  : "text-white/60"
              }`}
            >
              සිංහල
            </button>

            <span className="text-white/40">|</span>

            <button
              onClick={() => setLanguage("en")}
              className={`text-sm transition ${
                language === "en"
                  ? "font-semibold text-white"
                  : "text-white/60"
              }`}
            >
              English
            </button>
          </div>

          {/* Notifications */}
          <button className="rounded-lg p-2 transition hover:bg-white/10">
            <Bell size={20} />
          </button>

          {/* User Profile */}
          <button className="rounded-lg p-2 transition hover:bg-white/10">
            <UserCircle size={24} />
          </button>
        </div>
      </div>
    </header>
  );
}