import Link from "next/link";

export function RegisterPage() {
  return <section className="mx-auto max-w-md px-6 py-20"><h1 className="text-3xl font-bold">Create your account</h1><form className="mt-8 space-y-4"><input aria-label="Name" className="w-full rounded-md border border-slate-300 p-3" placeholder="Name" /><input aria-label="Email" className="w-full rounded-md border border-slate-300 p-3" placeholder="Email" type="email" /><input aria-label="Password" className="w-full rounded-md border border-slate-300 p-3" placeholder="Password" type="password" /><button className="w-full rounded-md bg-indigo-600 p-3 font-medium text-white" type="submit">Create account</button></form><p className="mt-4 text-sm">Already registered? <Link className="text-indigo-600" href="/login">Sign in</Link></p></section>;
}
