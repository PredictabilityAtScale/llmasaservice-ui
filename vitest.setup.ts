import '@testing-library/jest-dom';

// Polyfill matchMedia if needed by ReactMarkdown or other libs
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = function(query: string): any {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    };
  } as any;
}

// Basic localStorage mock
if (typeof window !== 'undefined' && !window.localStorage) {
  const store: Record<string,string> = {};
  // @ts-ignore
  window.localStorage = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    key: (i: number) => Object.keys(store)[i] ?? null,
    length: 0
  } as any;
}

// Surface unhandled rejections quickly
process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('UnhandledRejection in tests:', reason);
});
