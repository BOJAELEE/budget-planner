export type ScenarioView = 'expected' | 'actual';
export type MonthlyScenarioViews = Partial<Record<string, ScenarioView>>;

export const DASHBOARD_SCENARIO_VIEWS_KEY = 'budget-planner.dashboardScenarioViews.v1';

export function loadMonthlyScenarioViews(): MonthlyScenarioViews {
  try {
    const stored = localStorage.getItem(DASHBOARD_SCENARIO_VIEWS_KEY);
    if (stored === null) return {};
    const parsed: unknown = JSON.parse(stored);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const views: MonthlyScenarioViews = {};
    for (const [month, view] of Object.entries(parsed as Record<string, unknown>)) {
      if (/^\d{4}-(0[1-9]|1[0-2])$/.test(month) && (view === 'expected' || view === 'actual')) {
        views[month] = view;
      }
    }
    return views;
  } catch {
    return {};
  }
}

export function saveMonthlyScenarioViews(views: MonthlyScenarioViews): boolean {
  try {
    localStorage.setItem(DASHBOARD_SCENARIO_VIEWS_KEY, JSON.stringify(views));
    return true;
  } catch {
    return false;
  }
}
