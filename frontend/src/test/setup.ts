import '@testing-library/jest-dom';

// jsdom does not implement IntersectionObserver — provide a no-op stub
if (typeof window !== 'undefined' && !window.IntersectionObserver) {
  window.IntersectionObserver = class IntersectionObserver {
    constructor(_cb: IntersectionObserverCallback, _opts?: IntersectionObserverInit) {}
    observe() {}
    unobserve() {}
    disconnect() {}
    readonly root = null;
    readonly rootMargin = '';
    readonly thresholds: ReadonlyArray<number> = [];
    takeRecords(): IntersectionObserverEntry[] { return []; }
  };
}
