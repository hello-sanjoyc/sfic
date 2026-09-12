import { Brand } from "./brand";
import { Navbar } from "./navbar";

export function Header() {
  return <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5"><Brand /><Navbar /></header>;
}
