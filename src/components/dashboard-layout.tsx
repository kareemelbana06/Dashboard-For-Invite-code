import { Link, useNavigate } from "@tanstack/react-router";
import { Gauge, LogOut, Menu, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DashboardPage = "dashboard";

type DashboardLayoutProps = {
  active: DashboardPage;
  children: ReactNode;
};

export const APPEARANCE_STORAGE_KEY = "uber_invite_admin_pattern";
export const APPEARANCE_EVENT = "uber-invite-appearance-change";

export function DashboardLayout({ active, children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  const [decorativeBackground, setDecorativeBackground] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (stored !== null) setDecorativeBackground(stored === "on");

    function syncAppearance() {
      setDecorativeBackground(localStorage.getItem(APPEARANCE_STORAGE_KEY) !== "off");
    }

    window.addEventListener(APPEARANCE_EVENT, syncAppearance);
    return () => window.removeEventListener(APPEARANCE_EVENT, syncAppearance);
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    setError("");

    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        setError("حدث خطأ، يرجى المحاولة مرة أخرى.");
        setSigningOut(false);
        return;
      }
      await navigate({ to: "/login", replace: true });
    } catch {
      setError("حدث خطأ، يرجى المحاولة مرة أخرى.");
      setSigningOut(false);
    }
  }

  const linkClass = (isActive: boolean) =>
    `flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition ${
      isActive
        ? "bg-[#e8f5ec] text-[#137344] shadow-[inset_-3px_0_0_#16804e]"
        : "text-[#657169] hover:bg-[#f3f7f4] hover:text-[#202521]"
    }`;

  const homeLink = (
    <Link
      to="/dashboard"
      onClick={() => setMenuOpen(false)}
      aria-current={active === "dashboard" ? "page" : undefined}
      className={linkClass(active === "dashboard")}
    >
      <Gauge size={18} />
      <span>لوحة التحكم</span>
    </Link>
  );
  const signOutButton = (
    <button
      type="button"
      onClick={() => void handleSignOut()}
      disabled={signingOut}
      className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 text-sm font-semibold text-[#657169] transition hover:bg-[#fff3f1] hover:text-[#a33e34] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <LogOut size={18} />
      <span>{signingOut ? "جاري تسجيل الخروج..." : "تسجيل الخروج"}</span>
    </button>
  );

  return (
    <div
      dir="rtl"
      className={`min-h-screen text-[#202521] ${
        decorativeBackground
          ? "bg-[radial-gradient(ellipse_at_10%_10%,rgba(221,240,225,0.35),transparent_24%),#f7f9f7]"
          : "bg-[#f7f9f7]"
      }`}
    >
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="sticky top-0 hidden h-screen w-[258px] shrink-0 flex-col border-l border-[#e7ece8] bg-white px-5 py-7 lg:flex">
          <Brand />
          <nav aria-label="القائمة الرئيسية" className="mt-10 space-y-1.5">
            {homeLink}
          </nav>
          <div className="mt-auto border-t border-[#edf0ed] pt-4">{signOutButton}</div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-[#e7ece8] bg-white lg:hidden">
            <div className="flex min-h-[64px] items-center justify-between gap-4 px-4">
              <Brand compact />
              <button
                type="button"
                aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
                className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#e5ebe6] bg-white text-[#46544a] transition hover:bg-[#f3f7f4]"
              >
                {menuOpen ? <X size={19} /> : <Menu size={19} />}
              </button>
            </div>
            {menuOpen && (
              <div className="absolute inset-x-0 top-full border-b border-[#e7ece8] bg-white px-4 pb-4 pt-2 shadow-lg">
                <nav aria-label="القائمة الرئيسية" className="space-y-1.5">
                  {homeLink}
                  {signOutButton}
                </nav>
              </div>
            )}
          </header>

          <main className="px-8 py-8 max-md:px-5 max-md:py-6 max-sm:px-4 max-sm:py-5">
            <div className="mx-auto max-w-6xl">
              {error && (
                <p
                  role="alert"
                  className="mb-5 rounded-xl border border-[#f0d5d2] bg-[#fff2f0] px-4 py-3 text-sm text-[#a33e34]"
                >
                  {error}
                </p>
              )}
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/dashboard" className="flex w-fit items-center gap-3 rounded-xl">
      <span
        className={`flex items-center justify-center rounded-xl bg-[#e8f5ec] text-[#137344] ${
          compact ? "size-9" : "size-11"
        }`}
      >
        <Gauge size={compact ? 18 : 21} strokeWidth={2.1} />
      </span>
      <span>
        <span className="block text-sm font-bold tracking-tight text-[#202a23]">Uber Invite</span>
        <span className="mt-0.5 block text-xs text-[#8a958d]">إدارة روابط الدعوة</span>
      </span>
    </Link>
  );
}
