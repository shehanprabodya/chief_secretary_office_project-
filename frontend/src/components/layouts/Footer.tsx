export default function Footer() {
  return (
    <footer
      className="
        border-t
        border-[var(--color-border)]
        bg-[var(--color-surface)]
        py-5
      "
    >
      <div
        className="
          page-container
          flex
          flex-col
          gap-4
          text-center
          md:flex-row
          md:items-center
          md:justify-between
        "
      >
        {/* Copyright */}
        <p className="text-muted text-sm">
          © {new Date().getFullYear()} Office of the Chief Secretary,
          Southern Provincial Council. All rights reserved.
        </p>

        {/* Footer Links */}
        <nav>
          <ul
            className="
              flex
              flex-wrap
              justify-center
              gap-6
              text-sm
            "
          >
            <li>
              <button
                className="
                  text-muted
                  transition-colors
                  hover:text-[var(--color-primary)]
                "
              >
                Accessibility
              </button>
            </li>

            <li>
              <button
                className="
                  text-muted
                  transition-colors
                  hover:text-[var(--color-primary)]
                "
              >
                Privacy Policy
              </button>
            </li>

            <li>
              <button
                className="
                  text-muted
                  transition-colors
                  hover:text-[var(--color-primary)]
                "
              >
                Technical Support
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}