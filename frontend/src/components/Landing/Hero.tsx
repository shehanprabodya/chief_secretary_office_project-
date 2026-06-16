import { Headphones, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "../../assets/Srilankaemblem.png";

const officeNames = [
  "දකුණු පළාත් ප්‍රධාන ලේකම් කාර්යාලය",
  "தென் மாகாண பிரதான செயலாளர் அலுவலகம்",
  "Southern Province Chief Secretariat",
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[var(--color-primary)] ">
      <div className="page-container ">
        <div
          className="
            grid
            min-h-[700px]
            items-center
            gap-16
            lg:grid-cols-2
          "
        >
          {/* Content */}
          <div className="animate-fade-in">
            
            <h1
              className="
                mt-6
                text-3xl
                font-bold
                leading-tight
                text-white
                md:text-4xl
                lg:text-5xl
                py-5
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
                py-5
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
                w-full
                overflow-hidden
                rounded-2xl
                border
                border-white/10
                bg-white/5
                backdrop-blur-sm
                p-8
              "
            >
              <div className="flex flex-col items-center gap-8">
                <img
                  src={logo}
                  alt="MMCS Dashboard"
                  className="
                    h-78
                    w-auto
                    flex-shrink-0
                  "
                />
                <div className="flex flex-wrap gap-3 justify-center">
                  {officeNames.map((name) => (
                      <span
                      key={name}
                      className="
                          flex
                          items-center
                          justify-center
                          rounded-full
                          border
                          border-white/20
                          px-6
                          py-3
                          text-sm
                          text-white/80
                          flex-shrink-0
                          whitespace-nowrap
                          w-96
                      "
                      >
                      {name}
                      </span>
                  ))}
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}