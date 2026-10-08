export function getInviteCodeFromInviteUrl(value: string) {
  try {
    const url = new URL(value.trim());
    const queryCode = url.searchParams.get("invite_code");
    if (queryCode !== null) return queryCode;

    const invitePath = url.pathname.match(/\/invite\/([^/]+)/i);
    return invitePath?.[1] ? decodeURIComponent(invitePath[1]) : "";
  } catch {
    return "";
  }
}

export function getInviteCode(value: string) {
  try {
    const url = new URL(value);
    const queryCode = url.searchParams.get("invite_code");
    if (queryCode) return queryCode;
    if (url.pathname.includes("/signup/drive/deliver")) return "";

    const parts = url.pathname.split("/").filter(Boolean);
    const lastPart = parts.at(-1);
    return lastPart && lastPart.toLowerCase() !== "invite" ? lastPart : "";
  } catch {
    return "";
  }
}

export function updateInviteCode(value: string, code: string) {
  try {
    const normalized = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const url = new URL(normalized);

    if (url.searchParams.has("invite_code") || url.pathname.includes("/signup/drive/deliver")) {
      if (code) url.searchParams.set("invite_code", code);
      else url.searchParams.delete("invite_code");
      return url.toString();
    }

    const parts = url.pathname.split("/").filter(Boolean);

    if (parts.at(-1)?.toLowerCase() === "invite") {
      if (code) parts.push(code);
    } else if (parts.length > 0) {
      if (code) parts[parts.length - 1] = code;
      else parts.pop();
    } else if (code) {
      parts.push(code);
    }

    url.pathname = `/${parts.join("/")}`;
    return url.toString();
  } catch {
    return value;
  }
}
