import { describe, it, expect } from 'vitest';
import { cn, capitalize, truncate, formatDate, timeAgo, safeStringify, isValidEmail } from '@/lib/utils';

describe('cn', () => {
  it('merges class strings', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional falsy values', () => {
    const condition = false;
    expect(cn('foo', condition && 'bar', undefined, null)).toBe('foo');
  });

  it('handles object notation', () => {
    expect(cn({ active: true, hidden: false })).toBe('active');
  });
});

describe('capitalize', () => {
  it('uppercases the first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  it('returns empty string for empty input', () => {
    expect(capitalize('')).toBe('');
  });

  it('handles already-capitalised strings', () => {
    expect(capitalize('Hello')).toBe('Hello');
  });
});

describe('truncate', () => {
  it('returns the string unchanged when shorter than max', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('truncates and appends ellipsis when longer than max', () => {
    expect(truncate('hello world', 5)).toBe('hello…');
  });

  it('returns the string unchanged at exactly max length', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });
});

describe('formatDate', () => {
  it('returns a localised date string containing the year', () => {
    expect(formatDate('2024-01-15T00:00:00.000Z')).toContain('2024');
  });
});

describe('timeAgo', () => {
  it('returns "just now" for very recent timestamps', () => {
    expect(timeAgo(new Date().toISOString())).toBe('just now');
  });

  it('returns minutes ago', () => {
    const ts = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(timeAgo(ts)).toBe('5m ago');
  });

  it('returns hours ago', () => {
    const ts = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(ts)).toBe('2h ago');
  });

  it('returns days ago', () => {
    const ts = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(ts)).toBe('3d ago');
  });
});

describe('safeStringify', () => {
  it('stringifies plain objects', () => {
    expect(safeStringify({ a: 1 })).toBe('{\n  "a": 1\n}');
  });

  it('handles primitives', () => {
    expect(safeStringify(42)).toBe('42');
    expect(safeStringify('hello')).toBe('"hello"');
  });
});

describe('isValidEmail', () => {
  it('returns true for valid email addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('a.b+c@domain.co.uk')).toBe(true);
  });

  it('returns false for invalid email addresses', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('@missing-local.com')).toBe(false);
    expect(isValidEmail('missing-domain@')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});
