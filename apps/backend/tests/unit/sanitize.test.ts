import { sanitizeHtml, sanitizeFilename } from '../../src/utils/sanitize';

describe('Sanitize utilities', () => {
  describe('sanitizeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(sanitizeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;',
      );
    });

    it('should escape ampersands', () => {
      expect(sanitizeHtml('a & b')).toBe('a &amp; b');
    });

    it('should not modify plain text', () => {
      expect(sanitizeHtml('hello world')).toBe('hello world');
    });
  });

  describe('sanitizeFilename', () => {
    it('should replace special characters with underscores', () => {
      const result = sanitizeFilename('file name with spaces.txt');
      expect(result).toBe('file_name_with_spaces.txt');
    });

    it('should allow alphanumeric characters, dots, hyphens, and underscores', () => {
      expect(sanitizeFilename('my-file_name.txt')).toBe('my-file_name.txt');
    });

    it('should truncate filenames longer than 255 characters', () => {
      const longName = 'a'.repeat(300) + '.txt';
      expect(sanitizeFilename(longName).length).toBeLessThanOrEqual(255);
    });
  });
});
