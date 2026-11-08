import { describe, expect, it } from "vitest";
import { checkinReward, cycleDay, videoReward } from "./rewards";
describe("retention rewards", () => {
  it("awards one coin on ordinary check-in days", () => { for (let day = 1; day < 30; day++) expect(checkinReward(day)).toBe(1); });
  it("awards exactly thirty, not thirty-one, on day thirty", () => { expect(checkinReward(30)).toBe(30); });
  it("starts the next cycle at one on day thirty-one", () => { expect(cycleDay(30, "2026-11-08", "2026-11-09")).toBe(1); });
  it("advances only consecutive dates", () => { expect(cycleDay(29, "2026-11-08", "2026-11-09")).toBe(30); });
  it("restarts after a missing day", () => { expect(cycleDay(12, "2026-11-06", "2026-11-08")).toBe(1); });
  it("does not advance twice in a day", () => { expect(cycleDay(12, "2026-11-08", "2026-11-08")).toBe(12); });
  it("awards one for less than a minute", () => { expect(videoReward(59)).toBe(1); });
  it("awards three from one minute to under five", () => { expect(videoReward(60)).toBe(3); expect(videoReward(299)).toBe(3); });
  it("awards five from exactly five minutes", () => { expect(videoReward(300)).toBe(5); expect(videoReward(600)).toBe(5); });
});