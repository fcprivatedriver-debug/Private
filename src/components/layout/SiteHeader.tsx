import Link from "next/link";
import { auth } from "@/lib/auth";
import { signOut } from "@/lib/auth";

export async function SiteHeader() {
  const session = await auth();
  const role = session?.user?.role;

  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <Link href="/" className="logo">
          Mov<span>io</span>
        </Link>
        <nav className="nav-links">
          <Link href="/como-funciona">Como funciona</Link>
          <Link href="/para-motoristas">Motoristas</Link>
          {role === "CUSTOMER" && <Link href="/pedidos">Os meus pedidos</Link>}
          {role === "DRIVER" && <Link href="/painel">Painel</Link>}
          {role === "ADMIN" && <Link href="/admin">Admin</Link>}
          {!session ? (
            <>
              <Link href="/login">Entrar</Link>
              <Link href="/registo" className="btn btn-primary" style={{ padding: "0.55rem 1rem" }}>
                Começar
              </Link>
            </>
          ) : (
            <>
              <span className="muted" style={{ fontSize: "0.9rem" }}>
                {session.user.name}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button type="submit" className="btn btn-secondary" style={{ padding: "0.55rem 1rem" }}>
                  Sair
                </button>
              </form>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
