export type ThemeMode = 'dark' | 'light';

const THEME_KEY = 'cricket-scoreboard-theme';
const MOBILE_VIEW_KEY = 'cricket-scoreboard-mobile-view';

export function getThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem(THEME_KEY);
  return stored === 'light' ? 'light' : 'dark';
}

export function applyTheme(theme: ThemeMode) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('light', theme === 'light');
}

export function setThemeMode(theme: ThemeMode) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}

export function getMobileViewEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(MOBILE_VIEW_KEY) === 'true';
}

export function setMobileViewEnabled(value: boolean) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(MOBILE_VIEW_KEY, String(value));
}

export function getDisplayPopupFeatures(mobile: boolean) {
  return mobile
    ? 'popup=yes,toolbar=0,location=0,menubar=0,status=0,resizable=1,scrollbars=1,width=420,height=780'
    : 'popup=yes,toolbar=0,location=0,menubar=0,status=0,resizable=1,scrollbars=1,width=1200,height=800';
}
