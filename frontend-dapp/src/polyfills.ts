// Polyfills for Node.js modules in browser environment
import { Buffer } from 'buffer';

// Make Buffer available globally
(window as any).Buffer = Buffer;

// Define global if not exists
if (typeof (window as any).global === 'undefined') {
  (window as any).global = window;
}

// Define process if not exists
if (typeof (window as any).process === 'undefined') {
  (window as any).process = {
    env: {},
    version: '',
    nextTick: (cb: () => void) => setTimeout(cb, 0),
  };
}

export {};