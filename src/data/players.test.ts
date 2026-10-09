import { describe, expect, it } from 'vitest';
import { validateProfile } from './players';

const base = { display_name: 'Sam', level: 'Improver', utr_rating: null, preferred_courts: [], contact: '', visible: true };

describe('player cards', () => {
  it('needs a name', () => expect(validateProfile({ ...base, display_name: '  ' })).not.toBeNull());
  it('accepts UTR between 1 and 16.5', () => {
    expect(validateProfile({ ...base, utr_rating: 16.5 })).toBeNull();
    expect(validateProfile({ ...base, utr_rating: 17 })).not.toBeNull();
    expect(validateProfile({ ...base, utr_rating: 0.5 })).not.toBeNull();
  });
  it('rejects unknown levels', () => expect(validateProfile({ ...base, level: 'Pro' })).not.toBeNull());
});
