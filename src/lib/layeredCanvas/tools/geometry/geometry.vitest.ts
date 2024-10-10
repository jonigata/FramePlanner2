import { describe, it, expect } from 'vitest';
import { testSegmentIntersection, type Vector } from './geometry';

describe('segmentIntersection', () => {
  it('should return null for parallel lines', () => {
    const s0: [Vector, Vector] = [[0, 0], [1, 1]];
    const s1: [Vector, Vector] = [[0, 1], [1, 2]];
    expect(testSegmentIntersection(s0, s1)).toBeNull();
  });

  it('should return null for non-intersecting lines', () => {
    const s0: [Vector, Vector] = [[0, 0], [1, 0]];
    const s1: [Vector, Vector] = [[0, 1], [1, 1]];
    expect(testSegmentIntersection(s0, s1)).toBeNull();
  });

  it('should return the correct intersection point for intersecting lines', () => {
    const s0: [Vector, Vector] = [[0, 0], [2, 2]];
    const s1: [Vector, Vector] = [[0, 2], [2, 0]];
    const result = testSegmentIntersection(s0, s1);
    expect(result).not.toBeNull();
    if (result) {
      const [t, p] = result;
      expect(t).toBeCloseTo(0.5);
      expect(p).toEqual([1, 1]);
    }
  });

  it('should return null when the intersection point is outside the segments', () => {
    const s0: [Vector, Vector] = [[0, 0], [1, 1]];
    const s1: [Vector, Vector] = [[2, 2], [3, 3]];
    expect(testSegmentIntersection(s0, s1)).toBeNull();
  });

  it('should handle vertical and horizontal lines correctly', () => {
    const s0: [Vector, Vector] = [[1, 0], [1, 2]];
    const s1: [Vector, Vector] = [[0, 1], [2, 1]];
    const result = testSegmentIntersection(s0, s1);
    expect(result).not.toBeNull();
    if (result) {
      const [t, p] = result;
      expect(t).toBeCloseTo(0.5);
      expect(p).toEqual([1, 1]);
    }
  });

  it('should handle overlapping lines by returning null', () => {
    const s0: [Vector, Vector] = [[0, 0], [2, 2]];
    const s1: [Vector, Vector] = [[1, 1], [3, 3]];
    expect(testSegmentIntersection(s0, s1)).toBeNull();
  });

  it('should handle endpoints touching as intersecting', () => {
    const s0: [Vector, Vector] = [[0, 0], [1, 1]];
    const s1: [Vector, Vector] = [[1, 1], [2, 0]];
    const result = testSegmentIntersection(s0, s1);
    expect(result).not.toBeNull();
    if (result) {
      const [t, p] = result;
      expect(t).toBeCloseTo(1);
      expect(p).toEqual([1, 1]);
    }
  });
});
