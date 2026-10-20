import { describe, expect, it } from "vitest";
import { canEdit, canShare, canView, getAccess, type DocumentShare } from "./permissions";

const doc = { owner_id: "owner" };
const shares: DocumentShare[] = [
  { user_id: "ed", role: "editor" },
  { user_id: "vw", role: "viewer" },
];

const accessFor = (userId: string) => getAccess(doc, shares, userId);

describe("getAccess", () => {
  it("gives the owner owner access", () => expect(accessFor("owner")).toBe("owner"));
  it("gives an editor share editor access", () => expect(accessFor("ed")).toBe("editor"));
  it("gives a viewer share viewer access", () => expect(accessFor("vw")).toBe("viewer"));
  it("gives everyone else no access", () => expect(accessFor("stranger")).toBeNull());
  it("keeps owner access even if the owner also appears in the shares", () => {
    expect(getAccess(doc, [{ user_id: "owner", role: "viewer" }], "owner")).toBe("owner");
  });
});

describe("canView", () => {
  it("allows owner, editor and viewer", () => {
    for (const access of ["owner", "editor", "viewer"] as const) expect(canView(access)).toBe(true);
  });
  it("denies no access", () => expect(canView(null)).toBe(false));
});

describe("canEdit", () => {
  it("allows owner and editor", () => {
    expect(canEdit("owner")).toBe(true);
    expect(canEdit("editor")).toBe(true);
  });
  it("denies viewer and no access", () => {
    expect(canEdit("viewer")).toBe(false);
    expect(canEdit(null)).toBe(false);
  });
});

describe("canShare", () => {
  it("allows only the owner", () => expect(canShare("owner")).toBe(true));
  it("denies editor, viewer and no access", () => {
    expect(canShare("editor")).toBe(false);
    expect(canShare("viewer")).toBe(false);
    expect(canShare(null)).toBe(false);
  });
});
