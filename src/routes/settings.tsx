import { createFileRoute } from "@tanstack/react-router";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import {
  APPEARANCE_EVENT,
  APPEARANCE_STORAGE_KEY,
  DashboardLayout,
} from "@/components/dashboard-layout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "الإعدادات — Uber Invite" },
      { name: "description", content: "إعدادات حساب الإدارة ومظهر لوحة التحكم." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [decorativeBackground, setDecorativeBackground] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!active) return;
        if (error) throw error;
        if (!data.session) {
          window.location.replace("/login");
          return;
        }
        setAuthenticated(true);
        setDecorativeBackground(localStorage.getItem(APPEARANCE_STORAGE_KEY) !== "off");
      } catch {
        if (active) setErrorMessage("تعذّر التحقق من تسجيل الدخول. حاول تحديث الصفحة.");
      } finally {
        if (active) setLoading(false);
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") window.location.replace("/login");
    });

    void initialize();
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  function handleAppearanceChange(enabled: boolean) {
    setDecorativeBackground(enabled);
    localStorage.setItem(APPEARANCE_STORAGE_KEY, enabled ? "on" : "off");
    window.dispatchEvent(new Event(APPEARANCE_EVENT));
  }

  if (loading || !authenticated) {
    return (
      <div
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-[#f4f7f5] px-4 text-center text-sm text-[#657169]"
      >
        {errorMessage || "جاري التحقق من تسجيل الدخول..."}
      </div>
    );
  }

  return (
    <DashboardLayout active="dashboard">
      <section className="relative isolate overflow-hidden rounded-[26px] bg-[linear-gradient(115deg,#092016,#103d27_58%,#17633d)] px-7 py-7 text-white shadow-[0_20px_50px_rgba(10,51,31,0.14)] max-sm:rounded-[21px] max-sm:px-5 max-sm:py-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_10%,rgba(137,231,162,0.2),transparent_30%)]"
        />
        <p className="text-xs font-semibold text-[#c7efd1]">إدارة النظام</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight max-sm:text-xl">الإعدادات</h2>
        <p className="mt-2 text-sm leading-6 text-[#d4e7d9]/80">
          إعدادات حساب الإدارة وصفحة الهبوط ومظهر لوحة التحكم.
        </p>
      </section>

      <div className="mt-5 grid max-w-4xl gap-4">
        <section className="rounded-[22px] border border-[#e4ebe5] bg-white p-6 shadow-[0_10px_30px_rgba(24,48,31,0.04)] max-sm:p-5">
          <div className="flex items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#e9f6ed] text-[#16804e]">
              <ShieldCheck size={20} />
            </span>
            <div>
              <h3 className="text-base font-bold text-[#202a23]">حساب الإدارة</h3>
              <p className="mt-1 text-sm leading-6 text-[#829087]">
                معلومات صلاحية الحساب المستخدم لإدارة صفحة الدعوة.
              </p>
            </div>
          </div>
          <dl className="mt-5 grid gap-3 rounded-xl bg-[#f7faf7] p-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-[#829087]">نوع الحساب</dt>
              <dd className="mt-1.5 text-sm font-semibold text-[#29372e]">مدير النظام</dd>
            </div>
            <div>
              <dt className="text-xs text-[#829087]">الصلاحية</dt>
              <dd className="mt-1.5 text-sm font-semibold text-[#137344]">إدارة رابط الدعوة</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-[22px] border border-[#e4ebe5] bg-white p-6 shadow-[0_10px_30px_rgba(24,48,31,0.04)] max-sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#f0f5f1] text-[#16804e]">
                {decorativeBackground ? <Eye size={19} /> : <EyeOff size={19} />}
              </span>
              <div>
                <h3 className="text-base font-bold text-[#202a23]">مظهر لوحة التحكم</h3>
                <p className="mt-1 text-sm leading-6 text-[#829087]">
                  إظهار أو إخفاء التدرج الأخضر الخفيف في خلفية صفحات الإدارة.
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={decorativeBackground}
              aria-label="إظهار التدرج الأخضر في الخلفية"
              onClick={() => handleAppearanceChange(!decorativeBackground)}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#16804e]/20 ${
                decorativeBackground ? "bg-[#16804e]" : "bg-[#c7d0c9]"
              }`}
            >
              <span
                className={`size-5 rounded-full bg-white shadow-sm transition-transform ${
                  decorativeBackground ? "translate-x-1" : "translate-x-6"
                }`}
              />
            </button>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
