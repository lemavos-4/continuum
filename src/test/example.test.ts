import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_NOTE_FONT_SIZE, loadNoteFontSize, resetNoteFontSize, saveNoteFontSize } from "@/lib/note-font-size";

describe("note font size", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores and resets title and body font sizes independently", () => {
    saveNoteFontSize({ titleScale: 130, bodyScale: 90 });

    expect(loadNoteFontSize()).toEqual({ titleScale: 130, bodyScale: 90 });

    resetNoteFontSize();

    expect(loadNoteFontSize()).toEqual(DEFAULT_NOTE_FONT_SIZE);
  });
});
