import { computeSrs } from "@/lib/srs";

const DEFAULT_EASE = 2.5;

describe("computeSrs", () => {
  // ---------------------------------------------------------------
  // Interval progression
  // ---------------------------------------------------------------
  describe("interval progression for successful recall (quality >= 3)", () => {
    it("returns nextInterval=1 on first review (currentInterval=0)", () => {
      const result = computeSrs({
        quality: 5,
        currentInterval: 0,
        currentEaseFactor: DEFAULT_EASE,
      });
      expect(result.nextInterval).toBe(1);
    });

    it("returns nextInterval=6 on second review (currentInterval=1)", () => {
      const result = computeSrs({
        quality: 5,
        currentInterval: 1,
        currentEaseFactor: DEFAULT_EASE,
      });
      expect(result.nextInterval).toBe(6);
    });

    it("multiplies interval by ease factor for subsequent reviews", () => {
      const ease = 2.5;
      const interval = 6;
      const result = computeSrs({
        quality: 5,
        currentInterval: interval,
        currentEaseFactor: ease,
      });
      expect(result.nextInterval).toBe(Math.round(interval * ease));
    });

    it("rounds the computed interval to the nearest integer", () => {
      const ease = 2.3;
      const interval = 7;
      const result = computeSrs({
        quality: 4,
        currentInterval: interval,
        currentEaseFactor: ease,
      });
      expect(result.nextInterval).toBe(Math.round(interval * ease));
    });

    it("uses currentEaseFactor (not nextEaseFactor) for interval multiplication", () => {
      const ease = 2.0;
      const interval = 10;
      const result = computeSrs({
        quality: 3,
        currentInterval: interval,
        currentEaseFactor: ease,
      });
      // interval * currentEase = 10 * 2.0 = 20
      expect(result.nextInterval).toBe(20);
    });
  });

  // ---------------------------------------------------------------
  // Failed recall (quality < 3)
  // ---------------------------------------------------------------
  describe("failed recall (quality < 3)", () => {
    it("resets interval to 1 when quality=0", () => {
      const result = computeSrs({
        quality: 0,
        currentInterval: 30,
        currentEaseFactor: DEFAULT_EASE,
      });
      expect(result.nextInterval).toBe(1);
    });

    it("resets interval to 1 when quality=1", () => {
      const result = computeSrs({
        quality: 1,
        currentInterval: 15,
        currentEaseFactor: DEFAULT_EASE,
      });
      expect(result.nextInterval).toBe(1);
    });

    it("resets interval to 1 when quality=2", () => {
      const result = computeSrs({
        quality: 2,
        currentInterval: 60,
        currentEaseFactor: DEFAULT_EASE,
      });
      expect(result.nextInterval).toBe(1);
    });

    it("resets interval to 1 even on first review with quality<3", () => {
      const result = computeSrs({
        quality: 0,
        currentInterval: 0,
        currentEaseFactor: DEFAULT_EASE,
      });
      expect(result.nextInterval).toBe(1);
    });
  });

  // ---------------------------------------------------------------
  // Ease factor adjustment
  // ---------------------------------------------------------------
  describe("ease factor adjustment", () => {
    it("increases ease factor for perfect recall (quality=5)", () => {
      const result = computeSrs({
        quality: 5,
        currentInterval: 6,
        currentEaseFactor: DEFAULT_EASE,
      });
      // ef + (0.1 - 0*(0.08 + 0*0.02)) = 2.5 + 0.1 = 2.6
      expect(result.nextEaseFactor).toBeCloseTo(2.6, 10);
    });

    it("keeps ease factor unchanged for quality=4", () => {
      const result = computeSrs({
        quality: 4,
        currentInterval: 6,
        currentEaseFactor: DEFAULT_EASE,
      });
      // ef + (0.1 - 1*(0.08 + 1*0.02)) = 2.5 + (0.1 - 0.1) = 2.5
      expect(result.nextEaseFactor).toBeCloseTo(2.5, 10);
    });

    it("decreases ease factor for quality=3", () => {
      const result = computeSrs({
        quality: 3,
        currentInterval: 6,
        currentEaseFactor: DEFAULT_EASE,
      });
      // ef + (0.1 - 2*(0.08 + 2*0.02)) = 2.5 + (0.1 - 0.24) = 2.36
      expect(result.nextEaseFactor).toBeCloseTo(2.36, 10);
    });

    it("decreases ease factor significantly for quality=2", () => {
      const result = computeSrs({
        quality: 2,
        currentInterval: 6,
        currentEaseFactor: DEFAULT_EASE,
      });
      // ef + (0.1 - 3*(0.08 + 3*0.02)) = 2.5 + (0.1 - 0.42) = 2.18
      expect(result.nextEaseFactor).toBeCloseTo(2.18, 10);
    });

    it("decreases ease factor heavily for quality=1", () => {
      const result = computeSrs({
        quality: 1,
        currentInterval: 6,
        currentEaseFactor: DEFAULT_EASE,
      });
      // ef + (0.1 - 4*(0.08 + 4*0.02)) = 2.5 + (0.1 - 0.64) = 1.96
      expect(result.nextEaseFactor).toBeCloseTo(1.96, 10);
    });

    it("decreases ease factor maximally for quality=0", () => {
      const result = computeSrs({
        quality: 0,
        currentInterval: 6,
        currentEaseFactor: DEFAULT_EASE,
      });
      // ef + (0.1 - 5*(0.08 + 5*0.02)) = 2.5 + (0.1 - 0.9) = 1.7
      expect(result.nextEaseFactor).toBeCloseTo(1.7, 10);
    });

    it("follows the formula ef + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))", () => {
      for (let q = 0; q <= 5; q++) {
        const result = computeSrs({
          quality: q,
          currentInterval: 10,
          currentEaseFactor: 2.5,
        });
        const diff = 5 - q;
        const expected = Math.max(1.3, 2.5 + (0.1 - diff * (0.08 + diff * 0.02)));
        expect(result.nextEaseFactor).toBeCloseTo(expected, 10);
      }
    });
  });

  // ---------------------------------------------------------------
  // Ease factor floor (1.3)
  // ---------------------------------------------------------------
  describe("ease factor floor", () => {
    it("clamps ease factor to 1.3 when it would drop below", () => {
      const result = computeSrs({
        quality: 0,
        currentInterval: 6,
        currentEaseFactor: 1.3,
      });
      // 1.3 + (0.1 - 0.9) = 0.5, clamped to 1.3
      expect(result.nextEaseFactor).toBe(1.3);
    });

    it("clamps ease factor to exactly 1.3, not lower", () => {
      const result = computeSrs({
        quality: 1,
        currentInterval: 6,
        currentEaseFactor: 1.4,
      });
      // 1.4 + (0.1 - 0.64) = 0.86, clamped to 1.3
      expect(result.nextEaseFactor).toBe(1.3);
    });

    it("does not clamp when ease factor is exactly 1.3 and quality=5", () => {
      const result = computeSrs({
        quality: 5,
        currentInterval: 6,
        currentEaseFactor: 1.3,
      });
      // 1.3 + 0.1 = 1.4, above floor
      expect(result.nextEaseFactor).toBeCloseTo(1.4, 10);
    });

    it("repeated failures keep ease factor at 1.3", () => {
      let ease = 2.5;
      for (let i = 0; i < 20; i++) {
        const result = computeSrs({
          quality: 0,
          currentInterval: 1,
          currentEaseFactor: ease,
        });
        ease = result.nextEaseFactor;
        expect(ease).toBeGreaterThanOrEqual(1.3);
      }
      expect(ease).toBe(1.3);
    });
  });

  // ---------------------------------------------------------------
  // nextReviewAt
  // ---------------------------------------------------------------
  describe("nextReviewAt", () => {
    it("returns a Date object", () => {
      const result = computeSrs({
        quality: 5,
        currentInterval: 0,
        currentEaseFactor: DEFAULT_EASE,
      });
      expect(result.nextReviewAt).toBeInstanceOf(Date);
    });

    it("returns a date in the future", () => {
      const before = new Date();
      const result = computeSrs({
        quality: 5,
        currentInterval: 0,
        currentEaseFactor: DEFAULT_EASE,
      });
      expect(result.nextReviewAt.getTime()).toBeGreaterThan(before.getTime());
    });

    it("returns a date further in the future for larger intervals", () => {
      const short = computeSrs({
        quality: 5,
        currentInterval: 0,
        currentEaseFactor: DEFAULT_EASE,
      });
      const long = computeSrs({
        quality: 5,
        currentInterval: 6,
        currentEaseFactor: DEFAULT_EASE,
      });
      expect(long.nextReviewAt.getTime()).toBeGreaterThan(
        short.nextReviewAt.getTime(),
      );
    });

    it("is within a reasonable range (not more than 2 years out)", () => {
      const result = computeSrs({
        quality: 5,
        currentInterval: 100,
        currentEaseFactor: 2.5,
      });
      const twoYearsFromNow = new Date();
      twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
      expect(result.nextReviewAt.getTime()).toBeLessThan(
        twoYearsFromNow.getTime(),
      );
    });

    it("is set at noon UTC on the review day", () => {
      const result = computeSrs({
        quality: 5,
        currentInterval: 6,
        currentEaseFactor: DEFAULT_EASE,
      });
      expect(result.nextReviewAt.getUTCHours()).toBe(12);
      expect(result.nextReviewAt.getUTCMinutes()).toBe(0);
      expect(result.nextReviewAt.getUTCSeconds()).toBe(0);
    });
  });

  // ---------------------------------------------------------------
  // Full quality sweep (0 through 5)
  // ---------------------------------------------------------------
  describe("quality value sweep", () => {
    const qualities = [0, 1, 2, 3, 4, 5];

    it.each(qualities)(
      "returns valid results for quality=%i",
      (quality) => {
        const result = computeSrs({
          quality,
          currentInterval: 10,
          currentEaseFactor: DEFAULT_EASE,
        });
        expect(result.nextInterval).toBeGreaterThanOrEqual(1);
        expect(result.nextEaseFactor).toBeGreaterThanOrEqual(1.3);
        expect(result.nextReviewAt).toBeInstanceOf(Date);
        expect(result.nextReviewAt.getTime()).toBeGreaterThan(Date.now());
      },
    );
  });

  // ---------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------
  describe("edge cases", () => {
    it("handles very large intervals", () => {
      const result = computeSrs({
        quality: 5,
        currentInterval: 365,
        currentEaseFactor: 2.5,
      });
      expect(result.nextInterval).toBe(Math.round(365 * 2.5));
      expect(result.nextEaseFactor).toBeGreaterThanOrEqual(1.3);
    });

    it("handles minimum ease factor with successful recall", () => {
      const result = computeSrs({
        quality: 3,
        currentInterval: 10,
        currentEaseFactor: 1.3,
      });
      // interval should use 1.3 as multiplier: round(10 * 1.3) = 13
      expect(result.nextInterval).toBe(13);
    });

    it("quality=3 at boundary does not reset interval", () => {
      const result = computeSrs({
        quality: 3,
        currentInterval: 20,
        currentEaseFactor: 2.0,
      });
      expect(result.nextInterval).toBe(Math.round(20 * 2.0));
    });

    it("quality=2 at boundary does reset interval", () => {
      const result = computeSrs({
        quality: 2,
        currentInterval: 20,
        currentEaseFactor: 2.0,
      });
      expect(result.nextInterval).toBe(1);
    });

    it("simulates a full learning progression", () => {
      let interval = 0;
      let ease = 2.5;

      // First review: 0 -> 1
      let result = computeSrs({
        quality: 5,
        currentInterval: interval,
        currentEaseFactor: ease,
      });
      expect(result.nextInterval).toBe(1);
      interval = result.nextInterval;
      ease = result.nextEaseFactor;

      // Second review: 1 -> 6
      result = computeSrs({
        quality: 5,
        currentInterval: interval,
        currentEaseFactor: ease,
      });
      expect(result.nextInterval).toBe(6);
      interval = result.nextInterval;
      ease = result.nextEaseFactor;

      // Third review: 6 * ease
      result = computeSrs({
        quality: 5,
        currentInterval: interval,
        currentEaseFactor: ease,
      });
      expect(result.nextInterval).toBe(Math.round(6 * ease));
      expect(result.nextEaseFactor).toBeGreaterThan(2.5);

      // Intervals should keep growing
      const prevInterval = result.nextInterval;
      interval = result.nextInterval;
      ease = result.nextEaseFactor;
      result = computeSrs({
        quality: 5,
        currentInterval: interval,
        currentEaseFactor: ease,
      });
      expect(result.nextInterval).toBeGreaterThan(prevInterval);
    });

    it("simulates recovery after a failure", () => {
      // Start at a good state
      let interval = 30;
      let ease = 2.5;

      // Fail
      let result = computeSrs({
        quality: 0,
        currentInterval: interval,
        currentEaseFactor: ease,
      });
      expect(result.nextInterval).toBe(1);
      expect(result.nextEaseFactor).toBeLessThan(ease);

      // Recover with perfect recall
      interval = result.nextInterval;
      ease = result.nextEaseFactor;
      result = computeSrs({
        quality: 5,
        currentInterval: interval,
        currentEaseFactor: ease,
      });
      // From interval=1, should go to 6
      expect(result.nextInterval).toBe(6);
      expect(result.nextEaseFactor).toBeGreaterThan(ease);
    });
  });
});
