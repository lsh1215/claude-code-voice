import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPlatform, detectBinaries } from '../../plugin/src/utils/platform.js';

describe('getPlatform', () => {
  it('returns darwin on macOS', () => {
    vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin');
    expect(getPlatform()).toBe('darwin');
  });

  it('returns linux on Linux', () => {
    vi.spyOn(process, 'platform', 'get').mockReturnValue('linux');
    expect(getPlatform()).toBe('linux');
  });
});
