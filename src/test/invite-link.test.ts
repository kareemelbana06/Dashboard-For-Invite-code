import { describe, expect, it } from "vitest";

import { getInviteCode, getInviteCodeFromInviteUrl, updateInviteCode } from "@/lib/invite-link";

describe("invite link code editing", () => {
  it("extracts a code from the invite URL path", () => {
    expect(getInviteCodeFromInviteUrl("https://www.uber.com/invite/kareem")).toBe("kareem");
    expect(getInviteCodeFromInviteUrl("https://www.uber.com/invite/ABC123?source=share")).toBe(
      "ABC123",
    );
  });

  it("prefers invite_code query parameters on modern Uber URLs", () => {
    expect(
      getInviteCodeFromInviteUrl("https://www.uber.com/eg/en/s/c/deliver/?invite_code=5gvv48a"),
    ).toBe("5gvv48a");
    expect(
      getInviteCodeFromInviteUrl("https://www.uber.com/eg/en/s/c/deliver/?invite_code=ABC123"),
    ).toBe("ABC123");
  });

  it("uses an explicitly present query parameter before a legacy invite path", () => {
    expect(getInviteCodeFromInviteUrl("https://www.uber.com/invite/kareem?invite_code=")).toBe("");
  });

  it("trims whitespace and clears the code for empty or unrecognized URLs", () => {
    expect(getInviteCodeFromInviteUrl("  https://www.uber.com/invite/ABC123  ")).toBe("ABC123");
    expect(getInviteCodeFromInviteUrl("")).toBe("");
    expect(getInviteCodeFromInviteUrl("https://www.uber.com/signup/drive/deliver/")).toBe("");
    expect(getInviteCodeFromInviteUrl("https://www.uber.com/eg/en/s/c/deliver/")).toBe("");
    expect(getInviteCodeFromInviteUrl("not a URL")).toBe("");
  });

  it("reads the Uber signup invite_code query parameter", () => {
    expect(getInviteCode("https://www.uber.com/signup/drive/deliver/?invite_code=5gvv48a")).toBe(
      "5gvv48a",
    );
  });

  it("updates the invite code in the Uber signup URL query", () => {
    expect(
      updateInviteCode(
        "https://www.uber.com/signup/drive/deliver/?invite_code=old-code",
        "new-code",
      ),
    ).toBe("https://www.uber.com/signup/drive/deliver/?invite_code=new-code");
  });

  it("reads and replaces a code in an invite path", () => {
    expect(getInviteCode("https://www.uber.com/invite/old-code")).toBe("old-code");
    expect(updateInviteCode("https://www.uber.com/invite/old-code", "new-code")).toBe(
      "https://www.uber.com/invite/new-code",
    );
  });

  it("removes a code from an Uber signup URL when the code is cleared", () => {
    expect(
      updateInviteCode("https://www.uber.com/signup/drive/deliver/?invite_code=old-code", ""),
    ).toBe("https://www.uber.com/signup/drive/deliver/");
  });
});
