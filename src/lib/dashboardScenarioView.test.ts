import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DASHBOARD_SCENARIO_VIEWS_KEY, loadMonthlyScenarioViews, saveMonthlyScenarioViews } from './dashboardScenarioView';

describe('monthly dashboard scenario preferences', () => {
  beforeEach(() => localStorage.removeItem(DASHBOARD_SCENARIO_VIEWS_KEY));
  afterEach(() => vi.restoreAllMocks());

  it('starts with no selected months and saves expected and actual choices by full year-month', () => {
    expect(loadMonthlyScenarioViews()).toEqual({});
    expect(saveMonthlyScenarioViews({ '2026-05': 'expected', '2026-06': 'actual', '2025-05': 'actual' })).toBe(true);
    expect(loadMonthlyScenarioViews()).toEqual({ '2026-05': 'expected', '2026-06': 'actual', '2025-05': 'actual' });
  });

  it.each(['not json', 'null', '[]', '"actual"', '4'])('ignores malformed storage %s', (stored) => {
    localStorage.setItem(DASHBOARD_SCENARIO_VIEWS_KEY, stored);
    expect(loadMonthlyScenarioViews()).toEqual({});
  });

  it('keeps valid preferences while ignoring invalid months and modes', () => {
    localStorage.setItem(DASHBOARD_SCENARIO_VIEWS_KEY, JSON.stringify({
      '2026-05': 'expected', '2026-06': 'actual', '2026-13': 'actual', 'invalid': 'actual',
      '2026-07': 'other', '2026-08': null,
    }));
    expect(loadMonthlyScenarioViews()).toEqual({ '2026-05': 'expected', '2026-06': 'actual' });
  });

  it('handles blocked storage without throwing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(loadMonthlyScenarioViews()).toEqual({});
    expect(saveMonthlyScenarioViews({ '2026-05': 'actual' })).toBe(false);
  });
});
