import PillarCard from "./PillarCard";

const pillars = [
  {
    title: "Secure Approvals",
    description:
      "Multi-level approval workflows with complete transparency and accountability for official directives.",
  },
  {
    title: "Institutional Transparency",
    description:
      "Real-time monitoring and tracking of development projects across provincial departments.",
  },
  {
    title: "Automated Reporting",
    description:
      "Generate reports, meeting summaries, and operational insights with minimal manual effort.",
  },
  {
    title: "Strategic Reporting",
    description:
      "Comprehensive KPI dashboards and executive-level analytics to support informed decision-making.",
  },
];

export default function PillarsSection() {
  return (
    <section className="bg-[var(--color-background)] py-24">
      <div className="page-container">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <h2
            className="
              text-4xl
              font-bold
              text-[var(--color-primary)]
              md:text-5xl
            "
          >
            Core Operational Pillars
          </h2>

          <p className="text-muted mt-4 text-lg">
            Standardizing administrative excellence
            through modern digital governance
            frameworks and streamlined workflows.
          </p>
        </div>

        {/* Pillars */}
        <div className="mt-16 grid gap-8">
          {pillars.map((pillar) => (
            <PillarCard
              key={pillar.title}
              title={pillar.title}
              description={pillar.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
}