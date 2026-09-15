import { useEffect, useState } from 'react';
import { usePrefs } from '@/store/usePrefs';

/** Applies theme, contrast and motion preferences to the document root. */
export function useTheme(): void {
  const theme = usePrefs((state) => state.theme);
  const highContrast = usePrefs((state) => state.highContrast);
  const reduceMotion = usePrefs((state) => state.reduceMotion);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches);
      root.classList.toggle('dark', dark);
      root.classList.toggle('hc', highContrast);
      root.classList.toggle('reduce-motion', reduceMotion);
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', dark ? '#0A1020' : '#EDF1F7');
    };

    apply();
    if (theme !== 'system') return;
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme, highContrast, reduceMotion]);
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  );
  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');
