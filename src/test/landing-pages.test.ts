import { beforeEach, describe, expect, it, vi } from "vitest";

const { supabaseFrom, update, eq, select, maybeSingle, inFilter } = vi.hoisted(() => ({
  supabaseFrom: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
  maybeSingle: vi.fn(),
  inFilter: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: supabaseFrom },
}));

import {
  DEFAULT_LANDING_PAGE_CUSTOMIZATION,
  getDefaultLandingPageCustomization,
  getLandingPageCustomization,
  loadLandingPages,
  LANDING_PAGE_DEFAULT_COLORS,
  LANDING_PAGE_DEFAULT_TEXT,
  LANDING_PAGE_IDS,
  saveLandingPageCustomization,
  saveLandingPageInvite,
} from "@/lib/landing-pages";

describe("landing page customization defaults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseFrom.mockReturnValue({ update, select });
    update.mockReturnValue({ eq });
    eq.mockReturnValue({ select });
    select.mockReturnValue({ maybeSingle, in: inFilter });
    inFilter.mockReset();
  });

  it("preserves the existing design when customization is missing", () => {
    expect(LANDING_PAGE_DEFAULT_TEXT[1]).toEqual({
      heroTitle: "Start Your Journey With Uber",
      heroDescription:
        "Apply to deliver through the referral link below. The invite code is carried in the link, so it is applied automatically wherever Uber supports it.",
      heroButtonText: "Start Your Application",
    });
    expect(LANDING_PAGE_DEFAULT_TEXT[2]).toEqual({
      heroTitle: "Make your next move.",
      heroDescription:
        "Drive with your car or deliver by bike. Choose a path that fits your life and continue to Uber’s official signup process.",
      heroButtonText: "Start your application",
    });
    expect(getLandingPageCustomization(1, null)).toEqual(getDefaultLandingPageCustomization(1));
    expect(getLandingPageCustomization(2, {})).toEqual(getDefaultLandingPageCustomization(2));
  });

  it("uses only valid stored values and fills missing options with defaults", () => {
    expect(
      getLandingPageCustomization(1, {
        primaryColor: "#16804e",
        heroTitle: "عنوان جديد",
        showCTA: false,
        ignored: "not stored in the customization model",
      }),
    ).toEqual({
      ...getDefaultLandingPageCustomization(1),
      primaryColor: "#16804e",
      heroTitle: "عنوان جديد",
      showCTA: false,
    });
  });

  it("uses the selected page defaults when saved text values are empty", () => {
    expect(
      getLandingPageCustomization(2, {
        heroTitle: "",
        heroDescription: " ",
        heroButtonText: "",
      }),
    ).toEqual(getDefaultLandingPageCustomization(2));
  });

  it("only exposes the two existing landing page ids", () => {
    expect(LANDING_PAGE_IDS).toEqual([1, 2]);
  });

  it("loads both existing pages by slug instead of assuming their database ids", async () => {
    const firstPage = { id: 27, slug: "landing-1" };
    const secondPage = { id: 42, slug: "landing-2" };
    inFilter.mockResolvedValue({ data: [secondPage, firstPage], error: null });

    const pages = await loadLandingPages();

    expect(supabaseFrom).toHaveBeenCalledWith("landing_pages");
    expect(inFilter).toHaveBeenCalledExactlyOnceWith("slug", ["landing-1", "landing-2"]);
    expect(pages).toEqual([firstPage, secondPage]);
  });

  it("uses the independently measured original colors for each page", () => {
    expect(LANDING_PAGE_DEFAULT_COLORS[1]).toEqual({
      primaryColor: "#f9f9f9",
      buttonColor: "#f5f5f5",
      backgroundColor: "#020202",
      textColor: "#a4a4a4",
    });
    expect(LANDING_PAGE_DEFAULT_COLORS[2]).toEqual({
      primaryColor: "#f5f5f5",
      buttonColor: "#f5f5f5",
      backgroundColor: "#050505",
      textColor: "#dedede",
    });
    expect(LANDING_PAGE_DEFAULT_COLORS[1]).not.toEqual(LANDING_PAGE_DEFAULT_COLORS[2]);
  });

  it("saves only customization for the selected landing page id", async () => {
    const page = {
      id: 42,
      name: "Landing Page 2",
      slug: "landing-2",
      landing_page_url: "https://example.com/landing-2",
      invite_link: "https://example.com/invite",
      invite_code: "invite-code",
      updated_at: "2026-10-08T00:00:00.000Z",
      customization: getDefaultLandingPageCustomization(2),
    };
    maybeSingle.mockResolvedValue({ data: page, error: null });

    await saveLandingPageCustomization(42, DEFAULT_LANDING_PAGE_CUSTOMIZATION, 2);

    expect(supabaseFrom).toHaveBeenCalledWith("landing_pages");
    expect(update).toHaveBeenCalledExactlyOnceWith({
      customization: getDefaultLandingPageCustomization(2),
    });
    expect(eq).toHaveBeenCalledExactlyOnceWith("id", 42);
  });

  it("saves the complete modern invite URL and its extracted code on the selected page", async () => {
    const inviteLink = "https://www.uber.com/eg/en/s/c/deliver/?invite_code=5gvv48a";
    maybeSingle.mockResolvedValue({
      data: {
        id: 42,
        name: "Landing Page 2",
        slug: "landing-2",
        landing_page_url: "https://example.com/landing-2",
        invite_link: inviteLink,
        invite_code: "5gvv48a",
        updated_at: "2026-10-08T00:00:00.000Z",
        customization: null,
      },
      error: null,
    });

    await saveLandingPageInvite(42, inviteLink, "5gvv48a");

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        invite_link: inviteLink,
        invite_code: "5gvv48a",
      }),
    );
    expect(eq).toHaveBeenCalledExactlyOnceWith("id", 42);
  });
});
