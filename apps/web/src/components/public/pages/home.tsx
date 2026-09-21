import Link from "next/link";
import { ScrollAnimations } from "../common/scroll-animations";

export function HomePage() {
    return (
        <ScrollAnimations>
            <section className="mx-auto max-w-6xl px-6 py-24 text-center">
                <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
                    Seva First Innovation Challenge
                </p>
                <h1 className="mx-auto max-w-3xl text-5xl font-bold tracking-tight text-slate-950">
                    Innovate Locally. Impact Nationally.
                </h1>
                <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                    Identify a real problem around you, develop a practical
                    solution and show how it can create impact on the ground.
                </p>
                <div className="mt-10 flex justify-center gap-4">
                    <Link
                        className="rounded-md bg-indigo-600 px-5 py-3 font-medium text-white"
                        href="/register"
                    >
                        Register Now
                    </Link>
                    <Link
                        className="rounded-md border border-slate-300 px-5 py-3 font-medium"
                        href="/features"
                    >
                        Explore Themes
                    </Link>
                </div>
            </section>
        </ScrollAnimations>
    );
}
