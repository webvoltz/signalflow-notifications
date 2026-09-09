import { describe, expect, it } from 'vitest';
import { humanizeFirestoreError } from '../../utils/humanizeFirestoreError';

describe('humanizeFirestoreError', () => {
  it('explains an invalid project id', () => {
    const result = humanizeFirestoreError('Invalid project ID(your_project_id) or database ID()');

    expect(result).toContain('VITE_FIREBASE_PROJECT_ID');
    expect(result).toContain('no underscores');
  });

  it('explains a permission-denied write', () => {
    expect(humanizeFirestoreError('permission-denied')).toContain('firestore.rules');
  });

  it('explains an unreachable backend', () => {
    expect(humanizeFirestoreError('unavailable')).toContain('npm run emulators');
  });

  it('passes through an unrecognized message unchanged', () => {
    expect(humanizeFirestoreError('quota-exceeded')).toBe('quota-exceeded');
  });
});
