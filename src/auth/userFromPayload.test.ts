import { describe, expect, it } from "vitest";

import { portalUserFromPayload } from "./userFromPayload";

describe("portalUserFromPayload", () => {
  it("maps API user fields into PortalUser", () => {
    const user = portalUserFromPayload({
      id: 42,
      email: "a@example.com",
      first_name: "Anna",
      last_name: "Popov",
      role: "church_admin",
      church_id: 7,
    });
    expect(user).toEqual({
      id: 42,
      email: "a@example.com",
      displayName: "Anna Popov",
      role: "church_admin",
      initials: "AP",
      churchId: 7,
    });
  });

  it("coerces string church_id and churchId alias", () => {
    expect(
      portalUserFromPayload({
        id: 2,
        email: "a@example.com",
        church_id: "46",
        role: "priest",
      })?.churchId,
    ).toBe(46);
    expect(
      portalUserFromPayload({
        id: 2,
        email: "a@example.com",
        churchId: 46,
        role: "priest",
      })?.churchId,
    ).toBe(46);
  });

  it("rejects incomplete payloads", () => {
    expect(portalUserFromPayload({ email: "x@y.z" })).toBeNull();
  });
});
