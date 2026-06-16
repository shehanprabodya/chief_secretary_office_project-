import { Headphones, LogIn } from "lucide-react";
import { Link } from "react-router-dom";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[var(--color-primary)]">
      <div className="page-container">
        <div
          className="
            grid
            min-h-[700px]
            items-center
            gap-16
            py-20
            lg:grid-cols-2
          "
        >
          {/* Content */}
          <div className="animate-fade-in">
            <span
              className="
                inline-flex
                rounded-full
                border
                border-white/20
                px-4
                py-2
                text-sm
                text-white/80
              "
            >
              Southern Provincial Council
            </span>

            <h1
              className="
                mt-6
                text-4xl
                font-bold
                leading-tight
                text-white
                md:text-5xl
                lg:text-6xl
              "
            >
              Strengthening Digital Governance
              in Southern Province
            </h1>

            <p
              className="
                mt-6
                max-w-xl
                text-lg
                leading-8
                text-white/75
              "
            >
              The Meeting Management &
              Coordination System (MMCS)
              streamlines meetings, approvals,
              reporting, and collaboration across
              provincial departments with secure
              and transparent workflows.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                to="/login"
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-lg
                  bg-white
                  px-6
                  py-3
                  font-medium
                  text-[var(--color-primary)]
                  transition-all
                  hover:-translate-y-0.5
                "
              >
                <LogIn size={18} />
                Portal Login
              </Link>

              <button
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-lg
                  border
                  border-white/20
                  px-6
                  py-3
                  text-white
                  transition-all
                  hover:bg-white/10
                "
              >
                <Headphones size={18} />
                Contact Support
              </button>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div
            className="
              flex
              items-center
              justify-center
            "
          >
            <div
              className="
                overflow-hidden
                rounded-2xl
                border
                border-white/10
                bg-white/5
                p-4
                backdrop-blur-sm
              "
            >
              <img
                src="/images/dashboard-preview.png"
                alt="MMCS Dashboard"
                className="
                  w-full
                  max-w-xl
                  rounded-xl
                  shadow-2xl
                "
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}