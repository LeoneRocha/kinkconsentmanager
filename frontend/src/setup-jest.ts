import { jest } from '@jest/globals';
import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';

setupZonelessTestEnv();

if (typeof document !== 'undefined') {
  Object.defineProperty(document, 'doctype', {
    value: '<!DOCTYPE html>',
    configurable: true,
  });
}

// Mock para HTMLCanvasElement em jsdom
if (typeof HTMLCanvasElement !== 'undefined') {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    value: () => null,
    configurable: true,
  });
}

// Polyfill para Blob.prototype.text() ausente no jsdom usado pelo jest-environment-jsdom
if (typeof Blob !== 'undefined' && typeof Blob.prototype.text !== 'function') {
  Object.defineProperty(Blob.prototype, 'text', {
    configurable: true,
    writable: true,
    value: function text(this: Blob): Promise<string> {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = () => reject(reader.error ?? new Error('Failed to read Blob as text'));
        reader.readAsText(this);
      });
    },
  });
}

// Polyfill para URL.createObjectURL / revokeObjectURL ausentes no jsdom
if (typeof URL !== 'undefined') {
  if (typeof URL.createObjectURL !== 'function') {
    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      configurable: true,
      value: () => 'blob:mock-url',
    });
  }
  if (typeof URL.revokeObjectURL !== 'function') {
    Object.defineProperty(URL, 'revokeObjectURL', {
      writable: true,
      configurable: true,
      value: () => {},
    });
  }
}

// Mock para scrollIntoView ausente em jsdom
if (typeof Element !== 'undefined' && typeof Element.prototype.scrollIntoView !== 'function') {
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    value: jest.fn(),
    configurable: true,
    writable: true,
  });
}

// Mock para ResizeObserver utilizado por componentes PrimeNG / overlays
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}

// Suporte para matchMedia (preservando localStorage/sessionStorage reais do jsdom)
if (typeof globalThis.matchMedia !== 'function') {
  Object.defineProperty(globalThis, 'matchMedia', {
    writable: true,
    configurable: true,
    value: jest.fn().mockImplementation((...args: unknown[]) => {
      const media = typeof args[0] === 'string' ? args[0] : '';
      return {
        matches: false,
        media,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      };
    }),
  });
}
