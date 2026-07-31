import { describe, expect, it } from "vitest";
import { reminderDeduplicationKey } from "./notifications.js";
import { reminderJobId } from "../queue/reminder-queue.js";

describe("reminder idempotency keys", () => {
  it("creates a stable database key", () => {
    expect(reminderDeduplicationKey("COMPANY", "assignment-1")).toBe(
      "follow-up:COMPANY:assignment-1",
    );
  });

  it("creates a BullMQ-compatible stable job ID", () => {
    const id = reminderJobId("CONTACT", "assignment-1");

    expect(id).toBe("assignment-follow-up-CONTACT-assignment-1");
    expect(id).not.toContain(":");
  });
});
