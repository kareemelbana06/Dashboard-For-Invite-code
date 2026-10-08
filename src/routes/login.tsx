import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Gauge, LockKeyhole, Mail } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { supabase } from "@/integrations/supabase/client";
import loginBackground from "@/assets/login-background.svg";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — Uber Invite" },
      { name: "description", content: "سجّل الدخول لإدارة رابط دعوة أوبر." },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!active) return;

        if (error) {
          setErrorMessage("تعذّر التحقق من جلسة الدخول. حاول تحديث الصفحة.");
        } else if (data.session) {
          await navigate({ to: "/dashboard", replace: true });
          return;
        }
      } catch {
        if (active) setErrorMessage("تعذّر الاتصال بخدمة تسجيل الدخول. حاول مرة أخرى.");
      }

      if (active) setCheckingSession(false);
    }

    void checkSession();
    return () => {
      active = false;
    };
  }, [navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
        return;
      }

      await navigate({ to: "/dashboard", replace: true });
    } catch {
      setErrorMessage("تعذّر تسجيل الدخول الآن. تحقق من اتصالك وحاول مرة أخرى.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      dir="rtl"
      className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(145deg,#071711,#0c281a_58%,#103322)] px-5 py-8 text-[#202521] sm:px-8 sm:py-12 max-md:min-h-[100svh] max-md:px-4 max-md:py-5"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 hidden bg-cover bg-center md:block"
        style={{
          backgroundImage: `linear-gradient(115deg, rgba(5, 19, 13, 0.8), rgba(8, 28, 18, 0.44)), url("${loginBackground}")`,
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_15%_12%,rgba(53,155,91,0.18),transparent_34%),radial-gradient(ellipse_at_88%_92%,rgba(61,143,85,0.14),transparent_38%)] md:hidden"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_1px_1px,rgba(205,245,215,0.14)_1px,transparent_0)] bg-[size:26px_26px] opacity-40 md:hidden"
      />

      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 items-center gap-16 max-lg:max-w-4xl max-lg:gap-10 max-md:max-w-md max-md:grid-cols-1">
        <section className="relative order-1 w-full overflow-hidden rounded-[2rem] border border-white/60 bg-white/[0.94] p-8 shadow-[0_32px_100px_rgba(0,0,0,0.3)] backdrop-blur-2xl transition duration-300 hover:shadow-[0_38px_110px_rgba(0,0,0,0.36)] sm:p-10 max-md:rounded-[1.5rem] max-md:border-white/70 max-md:p-5 max-md:shadow-[0_24px_64px_rgba(0,0,0,0.28)] max-md:hover:shadow-[0_24px_64px_rgba(0,0,0,0.28)]">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-[#81dfa0] via-[#16804e] to-[#0d5937]" />
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#0e3321] text-[#9de3b2] shadow-[0_8px_20px_rgba(14,51,33,0.2)] max-md:size-12 max-md:rounded-[0.95rem]">
            <Gauge size={23} strokeWidth={2} />
          </div>

          <div className="mt-6 text-center max-md:mt-3">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#16804e] max-md:text-[0.7rem]">
              UBER INVITE
            </p>
            <h1 className="mt-3 text-[1.8rem] font-bold tracking-tight text-[#17221b] sm:text-3xl max-md:mt-2 max-md:text-[1.65rem]">
              تسجيل الدخول
            </h1>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-7 text-[#737e76] max-md:text-[0.84rem] max-md:leading-6">
              سجّل دخولك لإدارة رابط دعوة أوبر ومتابعة إعدادات صفحتك.
            </p>
          </div>

          {checkingSession ? (
            <div
              role="status"
              className="mt-9 flex items-center justify-center gap-3 text-sm text-[#68756c] max-md:mt-6"
            >
              <span className="size-4 animate-spin rounded-full border-2 border-[#c9d8cd] border-t-[#16804e]" />
              جاري التحقق من جلسة الدخول...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5 max-md:mt-5 max-md:space-y-3">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-semibold text-[#29352d]">
                  البريد الإلكتروني
                </label>
                <div className="group relative">
                  <Mail
                    size={17}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#8b978e] transition-colors group-focus-within:text-[#16804e]"
                  />
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@example.com"
                    dir="ltr"
                    className="min-h-[50px] w-full rounded-xl border border-[#dfe6df] bg-[#fbfcfb] py-3.5 pe-4 ps-12 text-sm text-[#202a23] outline-none transition duration-200 placeholder:text-[#a6afa8] hover:border-[#c8d6cb] focus:border-[#16804e] focus:bg-white focus:ring-4 focus:ring-[#16804e]/10 max-md:min-h-[52px]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold text-[#29352d]"
                >
                  كلمة المرور
                </label>
                <div className="group relative">
                  <LockKeyhole
                    size={17}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#8b978e] transition-colors group-focus-within:text-[#16804e]"
                  />
                  <input
                    id="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="أدخل كلمة المرور"
                    className="min-h-[50px] w-full rounded-xl border border-[#dfe6df] bg-[#fbfcfb] py-3.5 pe-4 ps-12 text-sm text-[#202a23] outline-none transition duration-200 placeholder:text-[#a6afa8] hover:border-[#c8d6cb] focus:border-[#16804e] focus:bg-white focus:ring-4 focus:ring-[#16804e]/10 max-md:min-h-[52px]"
                  />
                </div>
              </div>

              {errorMessage && (
                <p
                  role="alert"
                  className="rounded-xl border border-[#f0d5d2] bg-[#fff2f0] px-4 py-3 text-sm leading-6 text-[#a33e34]"
                >
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="group flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#16804e] to-[#11663e] px-5 py-3.5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(22,128,78,0.2)] transition duration-200 hover:-translate-y-0.5 hover:from-[#126b41] hover:to-[#0d5937] hover:shadow-[0_12px_24px_rgba(22,128,78,0.28)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#16804e]/25 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 max-md:min-h-[52px] max-md:hover:translate-y-0"
              >
                {submitting ? "جاري تسجيل الدخول..." : "دخول"}
                {!submitting && (
                  <ArrowLeft
                    size={16}
                    className="transition-transform group-hover:-translate-x-1"
                  />
                )}
              </button>
            </form>
          )}

          <p className="mt-7 text-center text-xs text-[#98a199] max-md:mt-4 max-md:leading-5">
            تسجيل آمن لإدارة رابط الدعوة الخاص بك
          </p>
        </section>

        <aside className="order-2 px-4 text-white max-md:hidden">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-4 py-2 text-xs font-medium text-[#d7f5df] shadow-lg backdrop-blur-md">
            <span className="size-2 rounded-full bg-[#7fe09d] shadow-[0_0_12px_rgba(127,224,157,0.8)]" />
            مساحة إدارة الدعوات
          </div>
          <h2 className="max-w-lg text-5xl font-bold leading-[1.25] tracking-tight max-lg:text-4xl">
            كل دعوة تبدأ
            <span className="mt-1 block text-[#9de3b2]">برابط واحد.</span>
          </h2>
          <p className="mt-5 max-w-md text-base leading-8 text-[#d4e4d8]/75">
            ادخل إلى لوحة التحكم لإدارة رابط أوبر ومشاركة دعوتك بسهولة.
          </p>

          <p className="mt-8 text-xs text-[#c3d8c9]/55">Uber Invite · مساحة إدارية خاصة</p>
        </aside>
      </div>
    </main>
  );
}
