import { describe, it, expect } from 'vitest';
import { formatDate, addDays, daysBetween, todayStr, clamp, uid } from '../dates.js';

describe('formatDate', () => {
  it('formats a date string in Hebrew locale', () => {
    const result = formatDate('2025-01-15');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('returns empty string for falsy input', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('')).toBe('');
  });
});

describe('addDays', () => {
  it('adds days to a date', () => {
    expect(addDays('2025-01-01', 5)).toBe('2025-01-06');
  });

  it('handles month boundary', () => {
    expect(addDays('2025-01-30', 3)).toBe('2025-02-02');
  });

  it('handles negative days', () => {
    expect(addDays('2025-01-10', -5)).toBe('2025-01-05');
  });
});

describe('daysBetween', () => {
  it('calculates days between two dates', () => {
    expect(daysBetween('2025-01-01', '2025-01-11')).toBe(10);
  });

  it('returns negative for reversed dates', () => {
    expect(daysBetween('2025-01-11', '2025-01-01')).toBe(-10);
  });

  it('returns 0 for same date', () => {
    expect(daysBetween('2025-03-15', '2025-03-15')).toBe(0);
  });
});

describe('todayStr', () => {
  it('returns ISO date string format', () => {
    const result = todayStr();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('clamp', () => {
  it('clamps value within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('handles edge values', () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe('uid', () => {
  it('returns a string', () => {
    expect(typeof uid()).toBe('string');
  });

  it('generates unique values', () => {
    const ids = new Set(Array.from({ length: 100 }, () => uid()));
    expect(ids.size).toBe(100);
  });

  it('has expected length', () => {
    expect(uid().length).toBe(7);
  });
});
