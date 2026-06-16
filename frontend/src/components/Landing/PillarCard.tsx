interface PillarCardProps {
  title: string;
  description: string;
  image?: string;
}

export default function PillarCard({
  title,
  description,
  image,
}: PillarCardProps) {
  return (
    <article
      className="
        card
        transition-all
        duration-200
        hover:-translate-y-1
      "
    >
      <div
        className="
          flex
          flex-col
          gap-8
          p-8
          lg:flex-row
          lg:items-center
          lg:justify-between
        "
      >
        <div className="flex-1">
          <h3
            className="
              text-2xl
              font-bold
              text-[var(--color-primary)]
              lg:text-3xl
            "
          >
            {title}
          </h3>

          <p
            className="
              text-muted
              mt-4
              max-w-2xl
              leading-7
            "
          >
            {description}
          </p>
        </div>

        {image && (
          <div className="shrink-0">
            <img
              src={image}
              alt={title}
              className="
                w-full
                max-w-[220px]
                rounded-lg
                object-cover
              "
            />
          </div>
        )}
      </div>
    </article>
  );
}