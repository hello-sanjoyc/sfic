export function SectionHeading({
    eyebrow,
    title,
    description,
    centered = false,
}: {
    eyebrow: string;
    title: string;
    description?: string;
    centered?: boolean;
}) {
    return (
        <div
            data-motion="text"
            className={centered ? "mx-auto max-w-3xl text-center" : "max-w-2xl"}
        >
            <p className="text-xs font-bold tracking-[.18em] text-[#0b1f3a] uppercase">
                {eyebrow}
            </p>
            <div
                className={
                    centered ? "tri-accent mx-auto mt-3" : "tri-accent mt-3"
                }
            >
                <span />
                <span />
                <span />
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-[#0b1f3a] md:text-4xl">
                {title}
            </h2>
            {description && (
                <p className="mt-4 text-base leading-7 text-slate-600">
                    {description}
                </p>
            )}
        </div>
    );
}
