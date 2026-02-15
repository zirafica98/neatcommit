/**
 * Language Detector Tests
 */

import { detectLanguage, isLanguageSupported } from '../../utils/language-detector';

describe('Language Detector', () => {
  describe('detectLanguage', () => {
    it('should detect JavaScript files', () => {
      expect(detectLanguage('test.js').language).toBe('javascript');
      expect(detectLanguage('test.jsx').language).toBe('javascript');
      expect(detectLanguage('test.mjs').language).toBe('javascript');
      expect(detectLanguage('test.cjs').language).toBe('javascript');
    });

    it('should detect TypeScript files', () => {
      expect(detectLanguage('test.ts').language).toBe('typescript');
      expect(detectLanguage('test.tsx').language).toBe('typescript');
    });

    it('should detect Java files', () => {
      expect(detectLanguage('Test.java').language).toBe('java');
    });

    it('should detect Python files', () => {
      expect(detectLanguage('test.py').language).toBe('python');
      expect(detectLanguage('test.pyw').language).toBe('python');
    });

    it('should detect PHP files', () => {
      expect(detectLanguage('test.php').language).toBe('php');
      expect(detectLanguage('test.phtml').language).toBe('php');
    });

    it('should detect C# files', () => {
      expect(detectLanguage('Test.cs').language).toBe('csharp');
      expect(detectLanguage('Test.csx').language).toBe('csharp');
    });

    it('should detect SQL files', () => {
      expect(detectLanguage('query.sql').language).toBe('sql');
    });

    it('should detect Go files', () => {
      expect(detectLanguage('main.go').language).toBe('go');
    });

    it('should detect Ruby files', () => {
      expect(detectLanguage('test.rb').language).toBe('ruby');
      expect(detectLanguage('test.rake').language).toBe('ruby');
    });

    it('should return unknown for unsupported files', () => {
      expect(detectLanguage('test.txt').language).toBe('unknown');
      expect(detectLanguage('test.md').language).toBe('unknown');
      expect(detectLanguage('test').language).toBe('unknown');
    });

    it('should handle file paths', () => {
      expect(detectLanguage('src/components/Test.tsx').language).toBe('typescript');
      expect(detectLanguage('/path/to/file.js').language).toBe('javascript');
    });
  });

  describe('isLanguageSupported', () => {
    it('should return true for supported languages', () => {
      expect(isLanguageSupported('test.js')).toBe(true);
      expect(isLanguageSupported('test.ts')).toBe(true);
      expect(isLanguageSupported('Test.java')).toBe(true);
      expect(isLanguageSupported('test.py')).toBe(true);
      expect(isLanguageSupported('test.php')).toBe(true);
      expect(isLanguageSupported('Test.cs')).toBe(true);
      expect(isLanguageSupported('query.sql')).toBe(true);
      expect(isLanguageSupported('main.go')).toBe(true);
      expect(isLanguageSupported('test.rb')).toBe(true);
    });

    it('should return false for unsupported languages', () => {
      expect(isLanguageSupported('test.txt')).toBe(false);
      expect(isLanguageSupported('test.md')).toBe(false);
      expect(isLanguageSupported('test.json')).toBe(false);
    });
  });
});
