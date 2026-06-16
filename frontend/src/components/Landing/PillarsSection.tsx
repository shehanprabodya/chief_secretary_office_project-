type Pillar = {
  title: string;
  description: string;
  accent: string;
};

const pillars: Pillar[] = [
  {
    title: "Secure Approvals",
    description:
      "Multi-level approval workflows with complete transparency and accountability for official directives.",
    accent: "from-sky-200 to-sky-400",
  },
  {
    title: "Institutional Transparency",
    description:
      "Real-time monitoring and tracking of development projects across provincial departments.",
    accent: "from-emerald-200 to-emerald-400",
  },
  {
    title: "Automated Reporting",
    description:
      "Generate reports, meeting summaries, and operational insights with minimal manual effort.",
    accent: "from-violet-200 to-violet-400",
  },
  {
    title: "Strategic Reporting",
    description:
      "Comprehensive KPI dashboards and executive-level analytics to support informed decision-making.",
    accent: "from-amber-200 to-amber-400",
  },
];

function PillarCard({ title, description, accent }: Pillar) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_30px_60px_-30px_rgba(15,23,42,0.25)]">
      <div className={`h-48 w-full bg-gradient-to-r ${accent}`} />
      <div className="flex flex-1 flex-col justify-between p-8">
        <div>
          <h3 className="text-2xl font-semibold text-[var(--color-primary)]">{title}</h3>
          <p className="text-muted mt-4 leading-7">{description}</p>
        </div>
      </div>
    </article>
  );
}

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
        <div className="mt-16 grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
          {pillars.map((pillar) => (
            <PillarCard
              key={pillar.title}
              title={pillar.title}
              description={pillar.description}
              accent={pillar.accent}
            />
          ))}
        </div>
      </div>
    </section>
  );
}