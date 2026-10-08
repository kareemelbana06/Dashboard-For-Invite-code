import type { Json, Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";

export const LANDING_PAGE_IDS = [1, 2] as const;
export type LandingPageId = (typeof LANDING_PAGE_IDS)[number];
export const LANDING_PAGE_SLUGS = ["landing-1", "landing-2"] as const;
export type LandingPageSlug = (typeof LANDING_PAGE_SLUGS)[number];

export function getLandingPageIdFromSlug(slug: string): LandingPageId | null {
  const index = LANDING_PAGE_SLUGS.findIndex((pageSlug) => pageSlug === slug);
  return index === -1 ? null : LANDING_PAGE_IDS[index];
}

export type LandingPageCustomization = {
  primaryColor: string;
  buttonColor: string;
  backgroundColor: string;
  textColor: string;
  heroTitle: string;
  heroDescription: string;
  heroButtonText: string;
  showSection: boolean;
  showCTA: boolean;
  showImage: boolean;
};

export const DEFAULT_LANDING_PAGE_CUSTOMIZATION: LandingPageCustomization = {
  primaryColor: "",
  buttonColor: "",
  backgroundColor: "",
  textColor: "",
  heroTitle: "",
  heroDescription: "",
  heroButtonText: "",
  showSection: true,
  showCTA: true,
  showImage: true,
};

export const LANDING_PAGE_DEFAULT_TEXT: Record<
  LandingPageId,
  Pick<LandingPageCustomization, "heroTitle" | "heroDescription" | "heroButtonText">
> = {
  1: {
    heroTitle: "Start Your Journey With Uber",
    heroDescription:
      "Apply to deliver through the referral link below. The invite code is carried in the link, so it is applied automatically wherever Uber supports it.",
    heroButtonText: "Start Your Application",
  },
  2: {
    heroTitle: "Make your next move.",
    heroDescription:
      "Drive with your car or deliver by bike. Choose a path that fits your life and continue to Uber’s official signup process.",
    heroButtonText: "Start your application",
  },
};

export const LANDING_PAGE_DEFAULT_COLORS: Record<
  LandingPageId,
  Pick<LandingPageCustomization, "primaryColor" | "buttonColor" | "backgroundColor" | "textColor">
> = {
  1: {
    primaryColor: "#f9f9f9",
    buttonColor: "#f5f5f5",
    backgroundColor: "#020202",
    textColor: "#a4a4a4",
  },
  2: {
    primaryColor: "#f5f5f5",
    buttonColor: "#f5f5f5",
    backgroundColor: "#050505",
    textColor: "#dedede",
  },
};

export function getDefaultLandingPageCustomization(id: LandingPageId): LandingPageCustomization {
  return {
    ...DEFAULT_LANDING_PAGE_CUSTOMIZATION,
    ...LANDING_PAGE_DEFAULT_TEXT[id],
  };
}

export type LandingPage = Pick<
  Tables<"landing_pages">,
  | "id"
  | "name"
  | "slug"
  | "landing_page_url"
  | "invite_link"
  | "invite_code"
  | "updated_at"
  | "customization"
>;

export function getLandingPageCustomization(
  id: LandingPageId,
  value: Json | null,
): LandingPageCustomization {
  const stored =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as { [key: string]: Json | undefined })
      : {};
  const defaults = LANDING_PAGE_DEFAULT_TEXT[id];
  const getText = (key: "heroTitle" | "heroDescription" | "heroButtonText") => {
    const text = stored[key];
    return typeof text === "string" && text.trim() ? text : defaults[key];
  };
  const getColor = (key: "primaryColor" | "buttonColor" | "backgroundColor" | "textColor") => {
    const color = stored[key];
    return typeof color === "string" && /^#[\da-f]{6}$/i.test(color) ? color : "";
  };

  return {
    primaryColor: getColor("primaryColor"),
    buttonColor: getColor("buttonColor"),
    backgroundColor: getColor("backgroundColor"),
    textColor: getColor("textColor"),
    heroTitle: getText("heroTitle"),
    heroDescription: getText("heroDescription"),
    heroButtonText: getText("heroButtonText"),
    showSection: typeof stored["showSection"] === "boolean" ? stored["showSection"] : true,
    showCTA: typeof stored["showCTA"] === "boolean" ? stored["showCTA"] : true,
    showImage: typeof stored["showImage"] === "boolean" ? stored["showImage"] : true,
  };
}

export async function loadLandingPages(): Promise<(LandingPage | null)[]> {
  const { data, error } = await supabase
    .from("landing_pages")
    .select("id, name, slug, landing_page_url, invite_link, invite_code, updated_at, customization")
    .in("slug", [...LANDING_PAGE_SLUGS]);

  if (error) throw error;

  return LANDING_PAGE_SLUGS.map(
    (slug) => data?.find((candidate) => candidate.slug === slug) ?? null,
  );
}

export async function saveLandingPageInvite(
  id: number,
  inviteLink: string,
  inviteCode: string,
): Promise<LandingPage> {
  const normalizedInviteLink = inviteLink.trim();
  if (!normalizedInviteLink) {
    throw new Error("Invite link cannot be empty.");
  }

  const parsedUrl = new URL(normalizedInviteLink);
  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw new Error("Invite link must use HTTP or HTTPS.");
  }

  const { data, error } = await supabase
    .from("landing_pages")
    .update({
      invite_link: normalizedInviteLink,
      invite_code: inviteCode.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, name, slug, landing_page_url, invite_link, invite_code, updated_at, customization")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Landing page was not found.");
  if (data.id !== id) throw new Error("Updated landing page id did not match the requested id.");

  return data;
}

export async function saveLandingPageCustomization(
  id: number,
  customization: LandingPageCustomization,
  defaultsId: LandingPageId,
): Promise<LandingPage> {
  const textDefaults = LANDING_PAGE_DEFAULT_TEXT[defaultsId];
  const safeCustomization = {
    ...customization,
    heroTitle: customization.heroTitle.trim() || textDefaults.heroTitle,
    heroDescription: customization.heroDescription.trim() || textDefaults.heroDescription,
    heroButtonText: customization.heroButtonText.trim() || textDefaults.heroButtonText,
  };
  const { data, error } = await supabase
    .from("landing_pages")
    .update({ customization: safeCustomization })
    .eq("id", id)
    .select("id, name, slug, landing_page_url, invite_link, invite_code, updated_at, customization")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Landing page was not found.");
  if (data.id !== id) throw new Error("Updated landing page id did not match the requested id.");

  return data;
}
