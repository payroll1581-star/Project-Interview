import { describe, it, expect } from 'vitest';
import { computeEvaluationResult } from './evaluation.js';

describe('computeEvaluationResult', () => {
  it('returns Hire at or above the 72% threshold', () => {
    expect(computeEvaluationResult(72, 100)).toBe('Hire');
    expect(computeEvaluationResult(100, 100)).toBe('Hire');
  });

  it('returns Compare between 60% and 71%', () => {
    expect(computeEvaluationResult(60, 100)).toBe('Compare');
    expect(computeEvaluationResult(71, 100)).toBe('Compare');
  });

  it('returns Reject below 60%', () => {
    expect(computeEvaluationResult(59, 100)).toBe('Reject');
    expect(computeEvaluationResult(0, 100)).toBe('Reject');
  });

  it('does not divide by zero when maxScore is 0', () => {
    expect(computeEvaluationResult(0, 0)).toBe('Reject');
  });
});
