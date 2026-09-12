import Link from "next/link";

export function LoginPage() {
  return <section className="mx-auto max-w-md px-6 py-20"><h1 className="text-3xl font-bold">Welcome back</h1><form className="mt-8 space-y-4"><input aria-label="Email" className="w-full rounded-md border border-slate-300 p-3" placeholder="Email" type="email" /><input aria-label="Password" className="w-full rounded-md border border-slate-300 p-3" placeholder="Password" type="password" /><button className="w-full rounded-md bg-slate-900 p-3 font-medium text-white" type="submit">Sign in</button></form><p className="mt-4 text-sm">New here? <Link className="text-indigo-600" href="/register">Create an account</Link></p></section>;
}
