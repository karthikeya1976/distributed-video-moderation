// Unit tests for lib/auth.ts — JWT/user localStorage helpers.
// Pure client-side logic, no network — safe to run in any CI environment.
import { describe, it, expect, beforeEach } from "vitest";
import { getToken, getUser, setAuth, clearAuth, type AuthUser } from "./auth";

const USER: AuthUser = {
  id: "u1",
  name: "Ada Lovelace",
  email: "ada@example.com",
  account_type: "creator",
  department: "Editing",
};

describe("auth localStorage helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null token when nothing stored", () => {
    expect(getToken()).toBeNull();
  });

  it("returns null user when nothing stored", () => {
    expect(getUser()).toBeNull();
  });

  it("round-trips token and user via setAuth/getToken/getUser", () => {
    setAuth("jwt-abc123", USER);
    expect(getToken()).toBe("jwt-abc123");
    expect(getUser()).toEqual(USER);
  });

  it("clearAuth removes both token and user", () => {
    setAuth("jwt-abc123", USER);
    clearAuth();
    expect(getToken()).toBeNull();
    expect(getUser()).toBeNull();
  });

  it("getUser does not throw on malformed stored JSON — returns null instead", () => {
    localStorage.setItem("redactor_user", "{not valid json");
    expect(getUser()).toBeNull();
  });
});
