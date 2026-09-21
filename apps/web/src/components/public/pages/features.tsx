const features = ["Launch tailored challenges", "Review ideas collaboratively", "Track outcomes in one place"];

export function FeaturesPage() {
  return <section className="mx-auto max-w-4xl px-6 py-20"><h1 className="text-4xl font-bold">Everything your challenge needs</h1><div className="mt-10 grid gap-4 sm:grid-cols-3">{features.map((feature) => <article className="rounded-xl bg-white p-6 shadow-sm" key={feature}>{feature}</article>)}</div></section>;
}
