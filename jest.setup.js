require('@testing-library/jest-dom');

// Web Crypto API 모의 구현
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: async (algorithm, data) => {
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest(algorithm, encoder.encode(data));
        return hashBuffer;
      },
    },
  },
});