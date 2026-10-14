import { describe, it, expect } from "vitest";
import {
  formatRelativeTime,
  formatMessageTime,
  formatDateSeparator,
  getTimezoneLabel,
  formatMeetingDateTime,
} from "./chat-date-utils";

describe("Chat Date Utils", () => {
  it("formats relative time correctly", () => {
    const now = new Date();
    expect(formatRelativeTime(now.toISOString())).toBe("Baru saja");

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    expect(formatRelativeTime(tenMinutesAgo.toISOString())).toBe("10 mnt lalu");

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(formatRelativeTime(twoHoursAgo.toISOString())).toBe("2 jam lalu");
  });

  it("formats date separators in Indonesian", () => {
    const now = new Date();
    expect(formatDateSeparator(now.toISOString())).toBe("Hari ini");

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(formatDateSeparator(yesterday.toISOString())).toBe("Kemarin");

    const oldDate = new Date("2026-01-15T10:00:00Z");
    const formatted = formatDateSeparator(oldDate.toISOString());
    expect(formatted).toContain("Januari");
  });

  it("formats chat time with timezone abbreviation", () => {
    const testDate = new Date("2026-10-14T14:30:00Z");
    const result = formatMessageTime(testDate.toISOString());
    expect(result).toMatch(/\d{2}:\d{2}\s+(WIB|WITA|WIT|UTC|[A-Z+0-9]+)/);
    expect(typeof getTimezoneLabel(testDate)).toBe("string");
  });

  it("formats meeting date and time", () => {
    const testDate = new Date("2026-10-15T14:00:00Z");
    const formatted = formatMeetingDateTime(testDate.toISOString());
    expect(formatted).toContain("pukul");
  });

  it("handles fallback for invalid date strings", () => {
    expect(formatRelativeTime("invalid-date")).toBe("");
    expect(formatDateSeparator("invalid-date")).toBe("");
    expect(formatMessageTime("invalid-date")).toBe("");
  });
});
