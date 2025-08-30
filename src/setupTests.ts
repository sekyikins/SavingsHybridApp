// Import the custom matchers from @testing-library/jest-dom
import '@testing-library/jest-dom/vitest';

// If you're using Vitest's globals, you can add this:
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Run cleanup after each test case (e.g., clearing jsdom)
afterEach(() => {
  cleanup();
});
