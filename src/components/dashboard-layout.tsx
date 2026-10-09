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

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    function closeOnDesktop() {
      if (window.matchMedia("(min-width: 1024px)").matches) setMenuOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", closeOnDesktop);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", closeOnDesktop);
    };
  }, [menuOpen]);

  async function handleSignOut() {
    setSigningOut(true);
    setError("");

    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        setError("لم نتمكن من تسجيل الخروج. حاول مرة أخرى.");
        setSigningOut(false);
        return;
      }
      await navigate({ to: "/login", replace: true });
    } catch {
      setError("لم نتمكن من تسجيل الخروج. حاول مرة أخرى.");
      setSigningOut(false);
    }
  }

  const linkClass = (isActive: boolean) =>
    `flex min-h-11 items-center gap-3 rounded-xl border-r-[3px] border-transparent px-3.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#16804e]/15 ${
      isActive
        ? "border-r-[#176d40] bg-[#eaf5ed] text-[#176d40]"
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
      <span>لوحة إدارة صفحاتك</span>
    </Link>
  );
  const signOutButton = (
    <button
      type="button"
      onClick={() => {
        setMenuOpen(false);
        void handleSignOut();
      }}
      disabled={signingOut}
      className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 text-sm font-semibold text-[#657169] transition hover:bg-[#fff3f1] hover:text-[#a33e34] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#16804e]/15 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <LogOut size={18} />
      <span>{signingOut ? "جاري تسجيل الخروج..." : "تسجيل الخروج"}</span>
    </button>
  );

  return (
    <div
      dir="rtl"
      className={`min-h-screen overflow-x-clip text-[#202521] ${
        decorativeBackground
          ? "bg-[radial-gradient(ellipse_at_10%_0%,rgba(221,240,225,0.34),transparent_26%),#f7f9f7]"
          : "bg-[#f7f9f7]"
      }`}
    >
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="sticky top-0 hidden h-screen w-[258px] shrink-0 flex-col border-l border-[#e6ebe7] bg-white px-5 py-7 shadow-[1px_0_0_rgba(25,45,32,0.015)] lg:flex">
          <Brand />
          <nav aria-label="القائمة الرئيسية" className="mt-11 space-y-2">
            {homeLink}
          </nav>
          <div className="mt-auto border-t border-[#edf0ed] pt-5">{signOutButton}</div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-[#e7ece8] bg-white pt-[env(safe-area-inset-top)] lg:hidden">
            <div className="flex min-h-[68px] items-center justify-between gap-4 px-4">
              <Brand compact />
              <button
                type="button"
                aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
                aria-expanded={menuOpen}
                aria-controls="mobile-navigation"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[#e2e9e3] bg-white text-[#46544a] shadow-[0_2px_8px_rgba(24,48,31,0.04)] transition hover:bg-[#f3f7f4] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#16804e]/15"
              >
                {menuOpen ? <X size={19} /> : <Menu size={19} />}
              </button>
            </div>
          </header>

          {menuOpen && (
            <>
              <button
                type="button"
                aria-label="إغلاق القائمة"
                onClick={() => setMenuOpen(false)}
                className="fixed inset-0 z-40 bg-[#10231a]/45 backdrop-blur-[2px] lg:hidden"
              />
              <aside
                id="mobile-navigation"
                aria-label="القائمة الرئيسية"
                className="fixed inset-y-0 right-0 z-50 flex h-[100dvh] w-[min(21rem,calc(100vw-2.5rem))] flex-col border-l border-[#e7ece8] bg-white px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))] shadow-[0_20px_60px_rgba(17,35,24,0.16)] lg:hidden"
              >
                <div className="flex items-center justify-between gap-3">
                  <Brand compact />
                  <button
                    type="button"
                    aria-label="إغلاق القائمة"
                    onClick={() => setMenuOpen(false)}
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[#e5ebe6] text-[#46544a] transition hover:bg-[#f3f7f4]"
                  >
                    <X size={19} />
                  </button>
                </div>
                <nav aria-label="القائمة الرئيسية" className="mt-9 space-y-2">
                  {homeLink}
                </nav>
                <div className="mt-auto border-t border-[#edf0ed] pt-5">{signOutButton}</div>
              </aside>
            </>
          )}

          <main className="min-w-0 px-8 py-9 max-md:px-6 max-md:py-7 max-sm:px-4 max-sm:py-5 max-sm:pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            <div className="mx-auto w-full min-w-0 max-w-6xl">
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
        className={`flex items-center justify-center rounded-[14px] bg-[#e8f5ec] text-[#137344] ring-1 ring-inset ring-[#d8ebdd] ${
          compact ? "size-10" : "size-12"
        }`}
      >
        <Gauge size={compact ? 19 : 22} strokeWidth={2.1} />
      </span>
      <span>
        <span className="block text-[15px] font-bold tracking-tight text-[#202a23]">
          Uber Invite
        </span>
        <span className="mt-0.5 block text-xs text-[#8a958d]">إدارة روابط الدعوة</span>
      </span>
    </Link>
  );
}
