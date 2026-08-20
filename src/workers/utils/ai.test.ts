import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeErrorMessage, cosineSimilarity } from './ai.ts';

describe('AI Worker Utils Security Tests', () => {
  it('sanitizeErrorMessage redacts API key from error message', () => {
    const apiKey = 'AIzaSy123456789SecretKey';
    const rawError = `Invalid API key: ${apiKey} provided in request`;

    const sanitized = sanitizeErrorMessage(rawError, apiKey);

    assert.equal(sanitized.includes(apiKey), false);
    assert.equal(sanitized.includes('[REDACTED_API_KEY]'), true);
    assert.equal(sanitized, 'Invalid API key: [REDACTED_API_KEY] provided in request');
  });

  it('sanitizeErrorMessage returns fallback when message is empty', () => {
    assert.equal(sanitizeErrorMessage('', 'key123'), 'An error occurred');
  });

  it('cosineSimilarity calculates similarity correctly', () => {
    const vecA = [1, 0, 0];
    const vecB = [1, 0, 0];
    assert.equal(cosineSimilarity(vecA, vecB), 1);
  });
});
