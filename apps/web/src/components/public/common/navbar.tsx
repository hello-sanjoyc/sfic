import Link from "next/link";

export function Navbar() {
  return (
    <nav className="flex items-center gap-5 text-sm text-slate-600">
      <Link href="/features">Features</Link>
      <Link href="/login">Sign in</Link>
      <Link className="rounded-md bg-slate-900 px-3 py-2 font-medium text-white" href="/register">Get started</Link>
    </nav>
  );
}
