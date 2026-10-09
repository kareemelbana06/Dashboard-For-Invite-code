import { createFileRoute } from "@tanstack/react-router";
import {
  Check,
  Clock3,
  Copy,
  ExternalLink,
  ImageUp,
  Link2,
  Pencil,
  Palette,
  RotateCcw,
  X,
} from "lucide-react";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";

import { DashboardLayout } from "@/components/dashboard-layout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  LANDING_PAGE_SLUGS,
  getLandingPageIdFromSlug,
  getDefaultLandingPageCustomization,
  getLandingPageCustomization,
  LANDING_PAGE_DEFAULT_COLORS,
  loadLandingPages,
  saveLandingPageImage,
  saveLandingPageCustomization,
  saveLandingPageInvite,
  type LandingPage,
  type LandingPageCustomization,
  type LandingPageImageKey,
  type LandingPageSlug,
} from "@/lib/landing-pages";
import { getInviteCodeFromInviteUrl } from "@/lib/invite-link";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "إدارة صفحات الدعوة — Uber Invite" },
      { name: "description", content: "إدارة روابط الدعوة وتخصيص صفحاتك بسهولة." },
    ],
  }),
  component: Dashboard,
});

type Notice = { type: "success" | "error"; text: string };

function formatUpdatedAt(value: string | null) {
  if (!value) return "لم يتم التحديث بعد";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const elapsedMinutes = Math.floor((Date.now() - date.getTime()) / 60_000);

  if (elapsedMinutes >= 0 && elapsedMinutes < 7 * 24 * 60) {
    const relativeTime = new Intl.RelativeTimeFormat("ar-EG-u-nu-latn", {
      numeric: "always",
    });
    const unit: Intl.RelativeTimeFormatUnit =
      elapsedMinutes < 60 ? "minute" : elapsedMinutes < 24 * 60 ? "hour" : "day";
    const amount =
      unit === "minute"
        ? Math.max(1, elapsedMinutes)
        : unit === "hour"
          ? Math.floor(elapsedMinutes / 60)
          : Math.floor(elapsedMinutes / (24 * 60));
    return relativeTime.format(-amount, unit).replace(/^قبل\s/, "منذ ");
  }

  return date.toLocaleDateString("ar-EG-u-nu-latn", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getPageTitle(slug: string) {
  return slug === "landing-1" ? "صفحة التسجيل الأولى" : "صفحة التسجيل الثانية";
}

const LANDING_PAGE_IMAGE_CONFIG: Record<
  LandingPage["slug"],
  {
    key: LandingPageImageKey;
    label: string;
    description: string;
    defaultFile: string;
  }[]
> = {
  "landing-1": [
    {
      key: "carImage",
      label: "صورة السيارة",
      description: "تظهر هذه الصورة بجانب خيار العمل بالسيارة في صفحتك.",
      defaultFile: "delivery-car.jpg",
    },
    {
      key: "bikeImage",
      label: "صورة الدراجة",
      description: "تظهر هذه الصورة بجانب خيار التوصيل بالدراجة في صفحتك.",
      defaultFile: "delivery-bike.jpg",
    },
  ],
  "landing-2": [
    {
      key: "heroCarImage",
      label: "صورة السيارة في أعلى الصفحة",
      description: "تظهر هذه الصورة في بداية صفحتك.",
      defaultFile: "hero-car.webp",
    },
    {
      key: "heroBikeImage",
      label: "صورة الدراجة في أعلى الصفحة",
      description: "تظهر هذه الصورة في بداية صفحتك.",
      defaultFile: "hero-bike.webp",
    },
    {
      key: "carImage",
      label: "صورة السيارة",
      description: "تظهر هذه الصورة بجانب خيار العمل بالسيارة في صفحتك.",
      defaultFile: "car-driver.webp",
    },
    {
      key: "bikeImage",
      label: "صورة الدراجة",
      description: "تظهر هذه الصورة بجانب خيار التوصيل بالدراجة في صفحتك.",
      defaultFile: "bike-courier.webp",
    },
  ],
};

const LANDING_PAGE_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_LANDING_PAGE_IMAGE_SIZE = 5 * 1024 * 1024;

function getImagePickerInputId(key: LandingPageImageKey) {
  return `landing-page-image-${key}`;
}

function validateLandingPageImage(file: File) {
  if (
    !LANDING_PAGE_IMAGE_MIME_TYPES.includes(
      file.type as (typeof LANDING_PAGE_IMAGE_MIME_TYPES)[number],
    )
  ) {
    return "نوع الصورة غير مدعوم. استخدم JPG أو PNG أو WebP.";
  }

  if (file.size > MAX_LANDING_PAGE_IMAGE_SIZE) {
    return "حجم الصورة يجب ألا يتجاوز 5 ميجابايت.";
  }

  return null;
}

function getPageImageConfig(slug: string) {
  if (slug === "landing-1" || slug === "landing-2") {
    return LANDING_PAGE_IMAGE_CONFIG[slug];
  }
  return [];
}

function getLandingPageSlug(slug: string): LandingPageSlug | null {
  return slug === "landing-1" || slug === "landing-2" ? slug : null;
}

function getStoragePathFromUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
    const bucketIndex = pathParts.indexOf("landing-images");
    if (bucketIndex === -1) return null;
    const storagePath = pathParts.slice(bucketIndex + 1).join("/");
    return storagePath ? decodeURIComponent(storagePath) : null;
  } catch {
    return null;
  }
}

function Dashboard() {
  const [pages, setPages] = useState<(LandingPage | null)[]>([null, null]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [editingPage, setEditingPage] = useState<LandingPage | null>(null);
  const [customizingPage, setCustomizingPage] = useState<LandingPage | null>(null);
  const [customization, setCustomization] = useState<LandingPageCustomization>(
    getDefaultLandingPageCustomization(1),
  );
  const [savingCustomization, setSavingCustomization] = useState(false);
  const [uploadingImageKey, setUploadingImageKey] = useState<LandingPageImageKey | null>(null);
  const [deletingImageKey, setDeletingImageKey] = useState<LandingPageImageKey | null>(null);
  const [imageToRestore, setImageToRestore] = useState<LandingPageImageKey | null>(null);
  const [pageImageUrls, setPageImageUrls] = useState<Partial<Record<LandingPageImageKey, string>>>(
    {},
  );
  const [loadingPageImages, setLoadingPageImages] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    let active = true;

    async function initializeDashboard() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!active) return;
        if (error) throw error;
        if (!data.session) {
          window.location.replace("/login");
          return;
        }

        const landingPages = await loadLandingPages();
        if (!active) return;
        setPages(landingPages);
        setAuthenticated(true);
      } catch {
        if (!active) return;
        setLoadError("لم نتمكن من تحميل صفحاتك. حاول تحديث الصفحة.");
      } finally {
        if (active) setLoading(false);
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") window.location.replace("/login");
    });

    void initializeDashboard();
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  function startEditing(page: LandingPage) {
    setEditingPage(page);
    setInviteLink(page.invite_link);
    setInviteCode(getInviteCodeFromInviteUrl(page.invite_link));
    setFormError("");
  }

  async function startCustomizing(page: LandingPage) {
    const pageId = getLandingPageIdFromSlug(page.slug);
    if (!pageId) {
      setNotice({ type: "error", text: "لم نتمكن من فتح تعديل الصفحة. حاول مرة أخرى." });
      return;
    }
    setCustomizingPage(page);
    const pageCustomization = getLandingPageCustomization(pageId, page.customization);
    setCustomization(pageCustomization);
    setPageImageUrls(
      Object.fromEntries(
        getPageImageConfig(page.slug)
          .filter(({ key }) => pageCustomization[key])
          .map(({ key }) => [key, pageCustomization[key]]),
      ),
    );
    setLoadingPageImages(true);
    try {
      const { data: files, error } = await supabase.storage
        .from("landing-images")
        .list(page.slug, { limit: 100 });
      if (error) throw error;

      const listedNames = new Set((files ?? []).map((file) => file.name));
      const availableUrls: Partial<Record<LandingPageImageKey, string>> = {};
      for (const { key, defaultFile } of getPageImageConfig(page.slug)) {
        const storedUrl = pageCustomization[key];
        if (storedUrl) {
          availableUrls[key] = storedUrl;
        } else if (listedNames.has(defaultFile)) {
          const { data } = supabase.storage
            .from("landing-images")
            .getPublicUrl(`${page.slug}/${defaultFile}`);
          availableUrls[key] = data.publicUrl;
        }
      }
      setPageImageUrls(availableUrls);
    } catch {
      setNotice({
        type: "error",
        text: "لم نتمكن من عرض الصور. أغلق النافذة وحاول فتحها مرة أخرى.",
      });
    } finally {
      setLoadingPageImages(false);
    }
  }

  function closeCustomization() {
    if (savingCustomization || uploadingImageKey || deletingImageKey) return;
    setImageToRestore(null);
    setCustomizingPage(null);
  }

  async function handleCustomizationSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customizingPage) return;

    setSavingCustomization(true);
    try {
      const pageId = getLandingPageIdFromSlug(customizingPage.slug);
      if (!pageId) throw new Error("Unknown landing page.");
      const savedPage = await saveLandingPageCustomization(
        customizingPage.id,
        customization,
        pageId,
      );
      setPages((currentPages) =>
        currentPages.map((page) => (page?.id === savedPage.id ? savedPage : page)),
      );
      setCustomizingPage(null);
      setNotice({ type: "success", text: "تم تحديث شكل الصفحة." });
    } catch {
      setNotice({ type: "error", text: "لم نتمكن من حفظ التعديلات. حاول مرة أخرى." });
    } finally {
      setSavingCustomization(false);
    }
  }

  async function handleCustomizationReset() {
    if (
      !customizingPage ||
      savingCustomization ||
      !window.confirm("هل تريد العودة إلى ألوان ونصوص الصفحة الأصلية؟")
    ) {
      return;
    }

    setSavingCustomization(true);
    try {
      const pageId = getLandingPageIdFromSlug(customizingPage.slug);
      if (!pageId) throw new Error("Unknown landing page.");
      const resetCustomization = {
        ...getDefaultLandingPageCustomization(pageId),
        heroImage: customization.heroImage,
        heroCarImage: customization.heroCarImage,
        heroBikeImage: customization.heroBikeImage,
        carImage: customization.carImage,
        bikeImage: customization.bikeImage,
      };
      const savedPage = await saveLandingPageCustomization(
        customizingPage.id,
        resetCustomization,
        pageId,
      );
      setPages((currentPages) =>
        currentPages.map((page) => (page?.id === savedPage.id ? savedPage : page)),
      );
      setCustomization(resetCustomization);
      setCustomizingPage(savedPage);
      setNotice({ type: "success", text: "تمت العودة إلى ألوان ونصوص الصفحة الأصلية." });
    } catch {
      setNotice({ type: "error", text: "لم نتمكن من استعادة شكل الصفحة. حاول مرة أخرى." });
    } finally {
      setSavingCustomization(false);
    }
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>, key: LandingPageImageKey) {
    const file = event.target.files?.[0];
    const page = customizingPage;
    if (!file || !page) {
      event.target.value = "";
      return;
    }

    const validationError = validateLandingPageImage(file);
    if (validationError) {
      setNotice({ type: "error", text: validationError });
      event.target.value = "";
      return;
    }

    const imageConfig = getPageImageConfig(page.slug).find((image) => image.key === key);
    if (!imageConfig) {
      setNotice({ type: "error", text: "لم نتمكن من تغيير الصورة. اختر صورة أخرى وحاول مجددًا." });
      event.target.value = "";
      return;
    }
    const slug = getLandingPageSlug(page.slug);
    if (!slug) {
      setNotice({ type: "error", text: "لم نتمكن من تغيير الصورة. اختر صورة أخرى وحاول مجددًا." });
      event.target.value = "";
      return;
    }

    let uploadedStoragePath: string | null = null;
    setUploadingImageKey(key);
    try {
      const extension =
        file.type === "image/jpeg" ? ".jpg" : file.type === "image/png" ? ".png" : ".webp";
      const storagePath = `${page.slug}/${key}-${Date.now()}-${crypto.randomUUID()}${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("landing-images")
        .upload(storagePath, file, { contentType: file.type, upsert: false });

      if (uploadError) throw uploadError;
      uploadedStoragePath = storagePath;

      const publicUrlData = supabase.storage.from("landing-images").getPublicUrl(storagePath);
      if (!publicUrlData.data?.publicUrl) throw new Error("Could not build public URL.");
      const publicUrl = publicUrlData.data.publicUrl;
      const previousImageUrl = customization[key];
      const savedPage = await saveLandingPageImage(slug, key, publicUrl);
      uploadedStoragePath = null;

      setPages((currentPages) =>
        currentPages.map((candidate) => (candidate?.id === savedPage.id ? savedPage : candidate)),
      );
      setCustomizingPage(savedPage);
      setCustomization((current) => ({ ...current, [key]: publicUrl }));
      setPageImageUrls((current) => ({ ...current, [key]: publicUrl }));

      if (previousImageUrl && previousImageUrl !== publicUrl) {
        const previousStoragePath = getStoragePathFromUrl(previousImageUrl);
        const defaultStoragePath = `${page.slug}/${imageConfig.defaultFile}`;
        if (
          previousStoragePath &&
          previousStoragePath !== defaultStoragePath &&
          previousStoragePath.startsWith(`${page.slug}/`)
        ) {
          try {
            const { error: cleanupError } = await supabase.storage
              .from("landing-images")
              .remove([previousStoragePath]);
            if (cleanupError) throw cleanupError;
          } catch (cleanupError) {
            console.error("Failed to remove the replaced landing image.", cleanupError);
            setNotice({
              type: "error",
              text: "تم تغيير الصورة، لكن لم نتمكن من إزالة الصورة السابقة.",
            });
            return;
          }
        }
      }

      setNotice({
        type: "success",
        text: "تم تغيير الصورة بنجاح، وستظهر في صفحتك.",
      });
    } catch {
      if (uploadedStoragePath) {
        try {
          const { error: cleanupError } = await supabase.storage
            .from("landing-images")
            .remove([uploadedStoragePath]);
          if (cleanupError) throw cleanupError;
        } catch (cleanupError) {
          console.error("Failed to remove an unreferenced landing image.", cleanupError);
        }
      }
      setNotice({ type: "error", text: "لم نتمكن من تغيير الصورة. اختر صورة أخرى وحاول مجددًا." });
    } finally {
      setUploadingImageKey(null);
      event.target.value = "";
    }
  }

  async function handleImageDelete(key: LandingPageImageKey) {
    const page = customizingPage;
    if (!page) return;

    const currentImageUrl = pageImageUrls[key];
    if (!currentImageUrl) return;

    const imageConfig = getPageImageConfig(page.slug).find((image) => image.key === key);
    if (!imageConfig) {
      setNotice({ type: "error", text: "لم نتمكن من العودة للصورة الأصلية. حاول مرة أخرى." });
      return;
    }
    const slug = getLandingPageSlug(page.slug);
    if (!slug) {
      setNotice({ type: "error", text: "لم نتمكن من العودة للصورة الأصلية. حاول مرة أخرى." });
      return;
    }
    const storagePath = getStoragePathFromUrl(currentImageUrl);
    const defaultStoragePath = `${page.slug}/${imageConfig.defaultFile}`;
    if (!customization[key] || storagePath === defaultStoragePath) {
      setNotice({
        type: "error",
        text: "هذه صورة أساسية ولا يمكن حذفها. غيّر الصورة أولًا ثم احذف النسخة الجديدة.",
      });
      return;
    }
    if (!storagePath || !storagePath.startsWith(`${page.slug}/`)) {
      setNotice({ type: "error", text: "لم نتمكن من تحديد الصورة. أغلق النافذة وحاول مرة أخرى." });
      return;
    }

    setDeletingImageKey(key);
    try {
      const { error: deleteError } = await supabase.storage
        .from("landing-images")
        .remove([storagePath]);
      if (deleteError) throw deleteError;

      const savedPage = await saveLandingPageImage(slug, key, "");
      setPages((currentPages) =>
        currentPages.map((candidate) => (candidate?.id === savedPage.id ? savedPage : candidate)),
      );
      setCustomizingPage(savedPage);
      setCustomization((current) => ({ ...current, [key]: "" }));
      const { data: files, error: listError } = await supabase.storage
        .from("landing-images")
        .list(page.slug, { limit: 100 });
      if (listError) throw listError;
      if ((files ?? []).some((file) => file.name === imageConfig.defaultFile)) {
        const { data } = supabase.storage.from("landing-images").getPublicUrl(defaultStoragePath);
        setPageImageUrls((current) => ({ ...current, [key]: data.publicUrl }));
      } else {
        setPageImageUrls((current) => {
          const next = { ...current };
          delete next[key];
          return next;
        });
      }
      setNotice({ type: "success", text: "تمت العودة للصورة الأصلية." });
    } catch {
      setNotice({ type: "error", text: "لم نتمكن من العودة للصورة الأصلية. حاول مرة أخرى." });
    } finally {
      setDeletingImageKey(null);
    }
  }

  function closeEditor() {
    if (saving) return;
    setEditingPage(null);
    setFormError("");
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingPage) return;

    const normalizedLink = inviteLink.trim();
    try {
      const url = new URL(normalizedLink);
      if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
    } catch {
      setFormError("تأكد من إدخال رابط تسجيل صحيح يبدأ بـ https:// أو http://.");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      const savedPage = await saveLandingPageInvite(editingPage.id, normalizedLink, inviteCode);
      setPages((currentPages) =>
        currentPages.map((page) => (page?.id === savedPage.id ? savedPage : page)),
      );
      setEditingPage(null);
      setNotice({ type: "success", text: "تم تحديث رابط التسجيل." });
    } catch {
      setFormError("لم نتمكن من حفظ الرابط. حاول مرة أخرى.");
    } finally {
      setSaving(false);
    }
  }

  async function copyInviteLink(page: LandingPage) {
    try {
      await navigator.clipboard.writeText(page.invite_link);
      setNotice({ type: "success", text: "تم نسخ الرابط" });
    } catch {
      setNotice({ type: "error", text: "لم نتمكن من نسخ الرابط. حاول مرة أخرى." });
    }
  }

  if (!authenticated) {
    return (
      <div
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-[#f7f9f7] px-4 text-center text-sm text-[#657169]"
      >
        {loading
          ? "جاري التحقق من تسجيل الدخول..."
          : loadError || "لم نتمكن من فتح صفحاتك. حاول تحديث الصفحة."}
      </div>
    );
  }

  const activePages = pages.filter((page): page is LandingPage => page !== null);
  const latestPage = activePages.reduce<LandingPage | null>((latest, page) => {
    if (!latest) return page;
    return new Date(page.updated_at).getTime() > new Date(latest.updated_at).getTime()
      ? page
      : latest;
  }, null);
  const customizingPageId = customizingPage ? getLandingPageIdFromSlug(customizingPage.slug) : null;
  const imageToRestoreConfig = customizingPage
    ? getPageImageConfig(customizingPage.slug).find(({ key }) => key === imageToRestore)
    : undefined;

  return (
    <DashboardLayout active="dashboard">
      <header className="min-w-0 border-b border-[#e7ece8] pb-6 max-sm:pb-5">
        <h1 className="break-words text-[2rem] font-bold leading-tight tracking-tight text-[#202a23] max-sm:text-[1.5rem]">
          لوحة إدارة صفحاتك
        </h1>
        <p className="mt-2.5 text-sm leading-6 text-[#657169] sm:text-[15px]">
          افتح صفحاتك، غيّر رابط التسجيل أو عدّل شكل الصفحة بخطوات بسيطة.
        </p>
      </header>

      <section
        aria-label="ملخص الصفحات"
        className="mt-6 grid min-w-0 grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 max-sm:mt-5 max-sm:gap-3"
      >
        <article className="flex min-h-[132px] min-w-0 items-center gap-4 rounded-2xl border border-[#e5ebe6] bg-white p-5 shadow-[0_3px_12px_rgba(24,48,31,0.025)] transition-shadow hover:shadow-[0_8px_24px_rgba(24,48,31,0.055)] max-sm:min-h-[112px] max-sm:gap-3 max-sm:rounded-xl max-sm:px-4 max-sm:py-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[#e9f6ed] text-[#16804e] ring-1 ring-inset ring-[#deece1] max-sm:size-10">
            <Link2 size={20} />
          </span>
          <div>
            <p className="text-sm font-semibold text-[#657169]">صفحاتك</p>
            <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-[#202a23]">
              {activePages.length}
            </p>
            <p className="mt-0.5 text-xs text-[#657169]">صفحاتك الجاهزة للزوار</p>
          </div>
        </article>
        <article className="flex min-h-[132px] min-w-0 items-center gap-4 rounded-2xl border border-[#e5ebe6] bg-white p-5 shadow-[0_3px_12px_rgba(24,48,31,0.025)] transition-shadow hover:shadow-[0_8px_24px_rgba(24,48,31,0.055)] max-sm:min-h-[112px] max-sm:gap-3 max-sm:rounded-xl max-sm:p-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[#f2f5f2] text-[#617267] ring-1 ring-inset ring-[#e8ece8] max-sm:size-10">
            <Clock3 size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#657169]">آخر تعديل</p>
            <p className="mt-1 truncate text-sm font-bold text-[#202a23]">
              {latestPage ? formatUpdatedAt(latestPage.updated_at) : "لا توجد تحديثات بعد"}
            </p>
            {latestPage && (
              <p className="mt-0.5 truncate text-xs text-[#657169]">
                {getPageTitle(latestPage.slug)}
              </p>
            )}
          </div>
        </article>
        <article className="flex min-h-[132px] min-w-0 items-center gap-4 rounded-2xl border border-[#e5ebe6] bg-white p-5 shadow-[0_3px_12px_rgba(24,48,31,0.025)] transition-shadow hover:shadow-[0_8px_24px_rgba(24,48,31,0.055)] max-sm:min-h-[112px] max-sm:gap-3 max-sm:rounded-xl max-sm:p-4">
          <span className="relative flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[#e9f6ed] text-[#16804e] ring-1 ring-inset ring-[#deece1] max-sm:size-10">
            <span className="absolute left-2 top-2 size-2 rounded-full bg-[#22a35a]" />
            <Check size={20} />
          </span>
          <div>
            <p className="text-sm font-semibold text-[#657169]">حالة صفحاتك</p>
            <p className="mt-1 text-sm font-bold text-[#137344]">جاهزة</p>
            <p className="mt-0.5 text-xs text-[#657169]">يمكنك فتحها أو تعديلها الآن</p>
          </div>
        </article>
      </section>

      {loadError && (
        <p
          role="alert"
          className="mt-5 rounded-xl border border-[#f0d5d2] bg-[#fff2f0] px-4 py-3 text-sm text-[#a33e34]"
        >
          لم نتمكن من تحميل صفحاتك. حاول تحديث الصفحة.
        </p>
      )}

      <section
        aria-label="صفحات الدعوة"
        className="mt-8 grid min-w-0 items-stretch gap-5 lg:grid-cols-2 max-sm:mt-6 max-sm:gap-4"
      >
        {LANDING_PAGE_SLUGS.map((slug) => {
          const page = pages.find((candidate) => candidate?.slug === slug) ?? null;
          return page ? (
            <article
              key={slug}
              className="group min-w-0 rounded-[20px] border border-[#e3ebe4] bg-white p-6 shadow-[0_4px_18px_rgba(24,48,31,0.035)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#d4e1d6] hover:shadow-[0_12px_30px_rgba(24,48,31,0.075)] max-sm:rounded-2xl max-sm:p-4 sm:p-5 lg:p-6"
            >
              <div className="flex items-start gap-3.5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[#e9f6ed] text-[#16804e] ring-1 ring-inset ring-[#deece1]">
                  <Link2 size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[17px] font-bold tracking-tight text-[#202a23]">
                    {getPageTitle(slug)}
                  </h2>
                  <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#eaf6ee] px-2.5 py-1 text-[11px] font-semibold text-[#137344]">
                    <span className="size-1.5 rounded-full bg-[#22a35a]" />
                    نشطة
                  </span>
                </div>
              </div>

              <dl className="mt-5 space-y-5">
                <div className="min-w-0">
                  <dt className="text-xs font-semibold text-[#657169]">رابط فتح الصفحة</dt>
                  <a
                    href={page.landing_page_url || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    dir="ltr"
                    title={page.landing_page_url || undefined}
                    aria-disabled={!page.landing_page_url}
                    className={`mt-2 block min-h-11 break-all rounded-xl border border-[#edf0ed] bg-[#f7f9f7] px-3.5 py-3 text-left text-[13px] leading-5 text-[#344138] transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#16804e]/15 ${
                      page.landing_page_url
                        ? "hover:border-[#d8e6da] hover:bg-[#f4f8f4] hover:text-[#137344] hover:underline"
                        : "pointer-events-none opacity-60"
                    }`}
                  >
                    {page.landing_page_url || "—"}
                  </a>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs font-semibold text-[#657169]">رابط التسجيل الحالي</dt>
                  <dd className="mt-2 flex min-w-0 items-stretch gap-2 max-sm:flex-col">
                    <span
                      dir="ltr"
                      title={page.invite_link || undefined}
                      className="min-h-11 min-w-0 flex-1 break-all rounded-xl border border-[#e8ede9] bg-white px-3.5 py-3 text-left text-[13px] leading-5 text-[#344138]"
                    >
                      {page.invite_link || "—"}
                    </span>
                    <button
                      type="button"
                      onClick={() => void copyInviteLink(page)}
                      disabled={!page.invite_link}
                      className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#dfe8e1] px-3.5 text-sm font-semibold text-[#334239] transition hover:bg-[#f7faf7] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#16804e]/15 disabled:cursor-not-allowed disabled:opacity-50 max-sm:w-full"
                    >
                      <Copy size={16} />
                      نسخ الرابط
                    </button>
                  </dd>
                </div>
                <div className="grid gap-4 rounded-xl bg-[#f7f9f7] p-4 sm:grid-cols-2">
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold text-[#657169]">كود الدعوة</dt>
                    <dd
                      dir="ltr"
                      className="mt-1.5 break-all text-left text-sm font-bold text-[#202a23]"
                    >
                      {page.invite_code || "لا يوجد كود"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-[#657169]">آخر تعديل للصفحة</dt>
                    <dd className="mt-1.5 text-sm font-semibold text-[#202a23]">
                      {formatUpdatedAt(page.updated_at)}
                    </dd>
                  </div>
                </div>
              </dl>

              <div className="mt-5 grid min-w-0 gap-2.5 border-t border-[#e5ebe6] pt-5 sm:grid-cols-2 xl:grid-cols-3">
                <a
                  href={page.landing_page_url || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={!page.landing_page_url}
                  className={`inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-[#dfe8e1] px-3 text-center text-sm font-semibold leading-5 text-[#334239] transition hover:bg-[#f7faf7] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#16804e]/15 ${
                    page.landing_page_url ? "" : "pointer-events-none opacity-50"
                  }`}
                >
                  <ExternalLink size={16} />
                  فتح الصفحة
                </a>
                <button
                  type="button"
                  onClick={() => startEditing(page)}
                  className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl bg-[#137344] px-3 text-center text-sm font-bold leading-5 text-white shadow-[0_2px_5px_rgba(29,78,216,0.16)] transition hover:bg-[#105f38] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#137344]/20"
                >
                  <Pencil size={16} />
                  تغيير رابط التسجيل
                </button>
                <button
                  type="button"
                  onClick={() => startCustomizing(page)}
                  className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-[#dfe8e1] px-3 text-center text-sm font-semibold leading-5 text-[#334239] transition hover:bg-[#f7faf7] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#16804e]/15"
                >
                  <Palette size={16} />
                  تعديل شكل الصفحة
                </button>
              </div>
            </article>
          ) : (
            <div
              key={slug}
              role="alert"
              className="rounded-[24px] border border-[#f0d5d2] bg-[#fff2f0] p-6 text-sm leading-6 text-[#a33e34] max-sm:rounded-[21px] max-sm:p-5"
            >
              لم نتمكن من عرض هذه الصفحة. حاول تحديث الصفحة.
            </div>
          );
        })}
      </section>

      {editingPage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#10231a]/55 p-3 backdrop-blur-sm max-sm:items-end max-sm:p-0"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeEditor();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-invite-title"
            className="max-h-[min(92dvh,860px)] w-full max-w-[calc(100vw-24px)] overflow-y-auto overscroll-contain rounded-[24px] bg-white p-5 shadow-2xl sm:max-w-lg sm:p-6 max-sm:max-h-[92dvh] max-sm:max-w-none max-sm:rounded-b-none max-sm:rounded-t-[24px] max-sm:pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="edit-invite-title" className="text-xl font-bold text-[#202a23]">
                  تغيير رابط التسجيل
                </h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-[#657169]">
                  لو وصلك رابط تسجيل جديد من Uber، ضعه هنا بدل الرابط الحالي.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                aria-label="إغلاق"
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[#657169] transition hover:bg-[#f3f7f4]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={(event) => void handleSave(event)} className="mt-6 space-y-5">
              <ol className="space-y-2 rounded-xl bg-[#f7f9f7] p-4 text-sm leading-6 text-[#657169]">
                <li>
                  <span className="font-bold text-[#137344]">الخطوة الأولى:</span> الصق رابط التسجيل
                  الجديد هنا.
                </li>
                <li>
                  <span className="font-bold text-[#137344]">الخطوة الثانية:</span> راجع الرابط قبل
                  الحفظ.
                </li>
                <li>
                  <span className="font-bold text-[#137344]">الخطوة الثالثة:</span> اضغط على حفظ
                  الرابط الجديد لتحديث الرابط في صفحتك.
                </li>
              </ol>
              <div>
                <label
                  htmlFor="invite-link"
                  className="mb-2 block text-sm font-semibold text-[#344138]"
                >
                  رابط التسجيل الجديد
                </label>
                <input
                  id="invite-link"
                  type="url"
                  required
                  value={inviteLink}
                  onChange={(event) => {
                    const value = event.target.value;
                    setInviteLink(value);
                    setInviteCode(getInviteCodeFromInviteUrl(value));
                  }}
                  placeholder="https://uber.com/invite/..."
                  dir="ltr"
                  className="min-h-[50px] w-full rounded-xl border border-[#dfe6df] bg-[#fbfcfb] px-4 text-left text-sm text-[#202a23] outline-none transition placeholder:text-[#a6afa8] focus:border-[#16804e] focus:bg-white focus:ring-4 focus:ring-[#16804e]/10"
                />
                <p className="mt-2 text-xs leading-5 text-[#657169]">
                  راجع الرابط أعلاه وتأكد أنه الرابط الذي تريد استخدامه.
                </p>
              </div>
              <div className="rounded-xl border border-[#e5ebe6] bg-[#f7f9f7] px-4 py-3">
                <p className="text-xs font-semibold text-[#657169]">كود الدعوة</p>
                <p dir="ltr" className="mt-1.5 text-left text-sm font-bold text-[#29372e]">
                  {inviteCode || "—"}
                </p>
                <p
                  className={`mt-1.5 text-xs leading-5 ${
                    inviteCode ? "text-[#137344]" : "text-[#a33e34]"
                  }`}
                >
                  {inviteCode
                    ? "تم العثور على كود الدعوة، وسيتم تحديثه مع الرابط."
                    : "لم نتمكن من العثور على كود دعوة داخل الرابط. راجع الرابط قبل الحفظ."}
                </p>
              </div>
              {formError && (
                <p
                  role="alert"
                  className="rounded-xl bg-[#fff2f0] px-4 py-3 text-sm text-[#a33e34]"
                >
                  {formError}
                </p>
              )}
              <div className="flex flex-wrap justify-end gap-3 border-t border-[#e5ebe6] pt-5 max-sm:flex-col">
                <button
                  type="button"
                  onClick={closeEditor}
                  disabled={saving}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-[#69766d] transition hover:bg-[#f3f6f3] disabled:opacity-50 max-sm:w-full"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#137344] px-5 text-sm font-bold text-white transition hover:bg-[#105f38] disabled:cursor-not-allowed disabled:opacity-60 max-sm:w-full"
                >
                  {saving ? "جارٍ حفظ الرابط..." : "حفظ الرابط الجديد"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {customizingPage && customizingPageId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#10231a]/55 p-3 backdrop-blur-sm sm:p-5 max-sm:p-0"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeCustomization();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="customization-title"
            className="flex h-[min(92dvh,860px)] max-h-[min(92dvh,860px)] w-full max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-[24px] bg-white p-4 shadow-2xl sm:max-w-2xl sm:p-6 max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:max-w-none max-sm:rounded-none max-sm:px-4 max-sm:pt-[calc(1rem+env(safe-area-inset-top))] max-sm:pb-[env(safe-area-inset-bottom)]"
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#e5ebe6] pb-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[#137344]">
                  {getPageTitle(customizingPage.slug)}
                </p>
                <h3 id="customization-title" className="mt-1 text-xl font-bold text-[#202a23]">
                  تعديل شكل الصفحة
                </h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[#657169]">
                  غيّر الألوان والعناوين لتناسب الشكل اللي تحبه.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCustomization}
                aria-label="إغلاق"
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[#657169] transition hover:bg-[#f3f7f4]"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(event) => void handleCustomizationSave(event)}
              className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain py-4 sm:py-5">
                <section className="rounded-2xl border border-[#e5ebe6] bg-[#fbfcfb] p-4 sm:p-5">
                  <div className="mb-4">
                    <h4 className="text-base font-bold text-[#202a23]">تغيير الألوان</h4>
                    <p className="mt-1 text-sm leading-6 text-[#657169]">
                      اختر لونًا جديدًا للعنوان أو الزر أو خلفية الصفحة أو النصوص.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {(
                      [
                        [
                          "primaryColor",
                          "لون العنوان الرئيسي",
                          "يغيّر لون العنوان الكبير الظاهر في بداية الصفحة.",
                        ],
                        [
                          "buttonColor",
                          "لون زر التقديم الرئيسي",
                          "يغيّر لون زر التقديم الرئيسي في الصفحة.",
                        ],
                        [
                          "backgroundColor",
                          "لون خلفية الصفحة",
                          "يغيّر لون الخلفية الرئيسية للصفحة.",
                        ],
                        ["textColor", "لون النصوص", "يغيّر لون النصوص والوصف داخل الصفحة."],
                      ] as const
                    ).map(([key, label, description]) => (
                      <div
                        key={key}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e5ebe6] bg-white p-3 sm:px-4"
                      >
                        <div className="min-w-0 flex-1">
                          <label
                            htmlFor={`customization-${key}`}
                            className="text-sm font-semibold text-[#344138]"
                          >
                            {label}
                          </label>
                          <p className="mt-1 text-xs leading-5 text-[#657169]">{description}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className="size-5 shrink-0 rounded-md border border-black/10"
                            style={{
                              backgroundColor:
                                customization[key] ||
                                LANDING_PAGE_DEFAULT_COLORS[customizingPageId][key],
                            }}
                            aria-hidden="true"
                          />
                          <span
                            dir="ltr"
                            className="min-w-[4.5rem] text-left text-xs font-semibold tabular-nums text-[#657169]"
                          >
                            {customization[key] ||
                              LANDING_PAGE_DEFAULT_COLORS[customizingPageId][key]}
                          </span>
                          <input
                            id={`customization-${key}`}
                            type="color"
                            aria-label={label}
                            value={
                              customization[key] ||
                              LANDING_PAGE_DEFAULT_COLORS[customizingPageId][key]
                            }
                            onChange={(event) =>
                              setCustomization((current) => ({
                                ...current,
                                [key]: event.target.value,
                              }))
                            }
                            className="size-10 cursor-pointer rounded-lg border border-[#e5ebe6] bg-white p-1"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-[#e5ebe6] bg-[#fbfcfb] p-4 sm:p-5">
                  <div className="mb-4">
                    <h4 className="text-base font-bold text-[#202a23]">تغيير النصوص</h4>
                    <p className="mt-1 text-sm leading-6 text-[#657169]">
                      اكتب العنوان والوصف اللذين تريد أن يراهما زوار صفحتك.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <label className="block">
                      <span className="block text-sm font-semibold text-[#202a23]">
                        العنوان الرئيسي
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-[#657169]">
                        هذا هو العنوان الكبير الذي يظهر في بداية الصفحة.
                      </span>
                      <input
                        type="text"
                        value={customization.heroTitle}
                        onChange={(event) =>
                          setCustomization((current) => ({
                            ...current,
                            heroTitle: event.target.value,
                          }))
                        }
                        className="mt-2 min-h-11 w-full rounded-xl border border-[#dfe6df] bg-white px-3 text-sm outline-none placeholder:text-[#a0aaa2] focus:border-[#16804e] focus:ring-4 focus:ring-[#16804e]/10"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-sm font-semibold text-[#202a23]">وصف الصفحة</span>
                      <span className="mt-1 block text-xs leading-5 text-[#657169]">
                        النص الذي يظهر أسفل العنوان الرئيسي.
                      </span>
                      <textarea
                        rows={3}
                        value={customization.heroDescription}
                        onChange={(event) =>
                          setCustomization((current) => ({
                            ...current,
                            heroDescription: event.target.value,
                          }))
                        }
                        className="mt-2 w-full resize-y rounded-xl border border-[#dfe6df] bg-white px-3 py-2.5 text-sm outline-none placeholder:text-[#a0aaa2] focus:border-[#16804e] focus:ring-4 focus:ring-[#16804e]/10"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-sm font-semibold text-[#202a23]">
                        نص زر التقديم
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-[#657169]">
                        النص الذي يظهر داخل زر الدعوة.
                      </span>
                      <input
                        type="text"
                        value={customization.heroButtonText}
                        onChange={(event) =>
                          setCustomization((current) => ({
                            ...current,
                            heroButtonText: event.target.value,
                          }))
                        }
                        className="mt-2 min-h-11 w-full rounded-xl border border-[#dfe6df] bg-white px-3 text-sm outline-none placeholder:text-[#a0aaa2] focus:border-[#16804e] focus:ring-4 focus:ring-[#16804e]/10"
                      />
                    </label>
                  </div>
                </section>

                <section className="rounded-2xl border border-[#e5ebe6] bg-[#fbfcfb] p-4 sm:p-5">
                  <div className="mb-4">
                    <h4 className="text-base font-bold text-[#202a23]">تغيير الصور</h4>
                    <p className="mt-1 text-sm leading-6 text-[#657169]">
                      تقدر تستبدل الصور الحالية بصور جديدة، أو ترجع للصورة الأصلية في أي وقت.
                    </p>
                    <p className="mt-2 text-xs leading-5 text-[#657169]">
                      الصور المقبولة: JPG أو PNG أو WebP، وبحجم لا يزيد على 5 ميجابايت.
                    </p>
                  </div>
                  <div className="grid gap-3 min-[640px]:grid-cols-2">
                    {getPageImageConfig(customizingPage.slug).map(
                      ({ key, label, description, defaultFile }) => {
                        const currentImage = pageImageUrls[key] || "";
                        const inputId = getImagePickerInputId(key);
                        const isUploading = uploadingImageKey === key;
                        const isDeleting = deletingImageKey === key;
                        const isBusy = isUploading || isDeleting;
                        const imageLoading = loadingPageImages && !currentImage;
                        const isDefaultImage =
                          !customization[key] ||
                          getStoragePathFromUrl(currentImage) ===
                            `${customizingPage.slug}/${defaultFile}`;

                        return (
                          <div
                            key={key}
                            className="min-w-0 rounded-xl border border-[#e5ebe6] bg-white p-3.5"
                          >
                            <div className="flex min-w-0 items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-[#202a23]">{label}</p>
                                <p className="mt-1 text-xs leading-5 text-[#657169]">
                                  {description}
                                </p>
                              </div>
                              <span
                                className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${
                                  !currentImage
                                    ? "bg-[#f2f5f2] text-[#69766d]"
                                    : isDefaultImage
                                      ? "bg-[#f2f5f2] text-[#69766d]"
                                      : "bg-[#eaf6ee] text-[#137344]"
                                }`}
                              >
                                {!currentImage
                                  ? "لم يتم العثور على صورة"
                                  : isDefaultImage
                                    ? "أنت تستخدم الصورة الأصلية"
                                    : "أنت تستخدم صورة بديلة"}
                              </span>
                            </div>

                            <div className="mt-3 aspect-[16/8] w-full overflow-hidden rounded-xl border border-[#dfe6df] bg-[#f7f9f7]">
                              {currentImage ? (
                                <img
                                  src={currentImage}
                                  alt={label}
                                  className="h-full w-full object-cover"
                                />
                              ) : imageLoading ? (
                                <div className="flex h-full w-full items-center justify-center text-sm text-[#657169]">
                                  جاري التحميل...
                                </div>
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[#657169]">
                                  <ImageUp size={20} />
                                </div>
                              )}
                            </div>

                            <div className="mt-3 grid min-w-0 gap-2 min-[440px]:grid-cols-2">
                              <input
                                id={inputId}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={(event) => void handleImageUpload(event, key)}
                                disabled={isBusy}
                              />

                              {currentImage ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => document.getElementById(inputId)?.click()}
                                    disabled={isBusy || loadingPageImages}
                                    className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-[#dfe6df] bg-white px-3 text-center text-sm font-semibold leading-5 text-[#334239] transition hover:bg-[#f7faf7] disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <ImageUp size={16} className="shrink-0" />
                                    {isUploading
                                      ? "جارٍ تغيير الصورة..."
                                      : isDefaultImage
                                        ? "اختيار صورة جديدة"
                                        : "تغيير الصورة"}
                                  </button>
                                  {!isDefaultImage && (
                                    <button
                                      type="button"
                                      onClick={() => setImageToRestore(key)}
                                      disabled={isBusy || loadingPageImages}
                                      className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-[#f0d5d2] bg-[#fff4f3] px-3 text-center text-sm font-semibold leading-5 text-[#9a453d] transition hover:bg-[#ffeae7] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      <RotateCcw size={16} className="shrink-0" />
                                      {isDeleting
                                        ? "جارٍ العودة للصورة الأصلية..."
                                        : "العودة للصورة الأصلية"}
                                    </button>
                                  )}
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => document.getElementById(inputId)?.click()}
                                  disabled={isBusy || loadingPageImages}
                                  className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl bg-[#137344] px-3 text-center text-sm font-bold leading-5 text-white transition hover:bg-[#105f38] disabled:cursor-not-allowed disabled:opacity-60 min-[440px]:col-span-2"
                                >
                                  <ImageUp size={16} className="shrink-0" />
                                  {isBusy ? "جارٍ تغيير الصورة..." : "اختيار صورة جديدة"}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-[#e5ebe6] bg-[#fbfcfb] p-4 sm:p-5">
                  <div className="mb-3">
                    <h4 className="text-base font-bold text-[#202a23]">اختيار ما يظهر في الصفحة</h4>
                    <p className="mt-1 text-sm leading-6 text-[#657169]">
                      تقدر تخفي أي قسم مش محتاجه، وتظهره مرة تانية وقت ما تحب.
                    </p>
                  </div>
                  <div className="divide-y divide-[#e5ebe6]">
                    {(
                      [
                        [
                          "showImage",
                          customizingPageId === 1
                            ? "صور خيارات السيارة والدراجة"
                            : "صور مقدمة الصفحة",
                          customizingPageId === 1
                            ? "إظهار أو إخفاء صور خيارات العمل أسفل عنوان الصفحة."
                            : "إظهار أو إخفاء الصور الموجودة في أعلى الصفحة.",
                        ],
                        [
                          "showSection",
                          customizingPageId === 1
                            ? "قسم طريقة العمل"
                            : "قسم خيارات السيارة والدراجة",
                          customizingPageId === 1
                            ? "إظهار هذا القسم أو إخفاؤه من الصفحة."
                            : "إظهار هذا القسم أو إخفاؤه من الصفحة.",
                        ],
                        [
                          "showCTA",
                          "زر التسجيل في أعلى الصفحة",
                          "إظهار الزر للزوار أو إخفاؤه من الصفحة.",
                        ],
                      ] as const
                    ).map(([key, label, description]) => (
                      <div
                        key={key}
                        className="flex min-h-[76px] items-center justify-between gap-3 py-3"
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-[#202a23]">
                            {label}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-[#657169]">
                            {description}
                          </span>
                        </span>
                        <span
                          className={`min-w-[5.5rem] text-left text-xs font-semibold ${
                            customization[key] ? "text-[#137344]" : "text-[#657169]"
                          }`}
                        >
                          {customization[key] ? "ظاهر للزوار" : "مخفي عن الزوار"}
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-label={`إظهار أو إخفاء: ${label}`}
                          aria-checked={customization[key]}
                          onClick={() =>
                            setCustomization((current) => ({ ...current, [key]: !current[key] }))
                          }
                          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#137344]/20 ${
                            customization[key] ? "bg-[#137344]" : "bg-[#c7d0c9]"
                          }`}
                        >
                          <span
                            className={`size-5 rounded-full bg-white shadow-sm transition-transform ${
                              customization[key] ? "translate-x-1" : "translate-x-6"
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[#e5ebe6] bg-white pt-4 max-sm:flex-col sm:pt-5">
                <button
                  type="button"
                  onClick={() => void handleCustomizationReset()}
                  disabled={savingCustomization}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-[#69766d] transition hover:bg-[#f3f6f3] disabled:opacity-50 max-sm:w-full"
                >
                  <RotateCcw size={16} />
                  العودة للألوان والنصوص الأصلية
                </button>
                <div className="flex flex-wrap justify-end gap-3 max-sm:w-full max-sm:flex-col">
                  <button
                    type="button"
                    onClick={closeCustomization}
                    disabled={savingCustomization}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-[#69766d] transition hover:bg-[#f3f6f3] disabled:opacity-50 max-sm:w-full"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={savingCustomization}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#137344] px-5 text-sm font-bold text-white transition hover:bg-[#105f38] disabled:cursor-not-allowed disabled:opacity-60 max-sm:w-full"
                  >
                    {savingCustomization ? "جارٍ حفظ التعديلات..." : "حفظ التعديلات"}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      )}

      <AlertDialog
        open={imageToRestore !== null}
        onOpenChange={(open) => {
          if (!open) setImageToRestore(null);
        }}
      >
        <AlertDialogContent
          dir="rtl"
          className="w-[calc(100vw-2rem)] max-w-md rounded-2xl border-[#e5ebe6] bg-white p-5 sm:p-6"
        >
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle className="text-[#202a23]">العودة للصورة الأصلية؟</AlertDialogTitle>
            <AlertDialogDescription className="leading-6 text-[#657169]">
              هل تريد حذف الصورة الجديدة
              {imageToRestoreConfig ? ` (${imageToRestoreConfig.label})` : ""} والعودة للصورة
              الأصلية؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:flex-row-reverse">
            <AlertDialogCancel className="mt-0 min-h-11 rounded-xl border-[#e5ebe6] text-[#202a23]">
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const key = imageToRestore;
                setImageToRestore(null);
                if (key) void handleImageDelete(key);
              }}
              className="min-h-11 rounded-xl bg-[#137344] text-white hover:bg-[#105f38]"
            >
              نعم، العودة للصورة الأصلية
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {notice && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-1/2 z-[60] flex max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-2 rounded-xl px-4 py-3 text-center text-sm font-semibold text-white shadow-xl ${
            notice.type === "success" ? "bg-[#137344]" : "bg-[#a33e34]"
          }`}
        >
          {notice.type === "success" && <Check size={17} />}
          {notice.text}
        </div>
      )}
    </DashboardLayout>
  );
}
