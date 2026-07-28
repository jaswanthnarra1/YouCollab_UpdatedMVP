import "@testing-library/jest-dom";

// jsdom has no IntersectionObserver — needed by framer-motion's useInView,
// used throughout the landing page's scroll-reveal sections.
class MockIntersectionObserver {
  observe = () => {};
  unobserve = () => {};
  disconnect = () => {};
}
Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  value: MockIntersectionObserver,
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
