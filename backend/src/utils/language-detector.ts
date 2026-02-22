/**
 * Language Detector
 * 
 * Šta radi:
 * - Detektuje programski jezik po ekstenziji fajla
 * - Podržava JavaScript/TypeScript (za MVP)
 * - Proširivo za druge jezike kasnije
 * 
 * Kako funkcioniše:
 * 1. Uzima filename ili filepath
 * 2. Ekstraktuje ekstenziju
 * 3. Mapira ekstenziju na jezik
 * 4. Vraća jezik ili 'unknown'
 */

export type SupportedLanguage =
  | 'javascript'
  | 'typescript'
  | 'java'
  | 'python'
  | 'php'
  | 'csharp'
  | 'sql'
  | 'go'
  | 'ruby'
  | 'swift'
  | 'kotlin'
  | 'rust'
  | 'c'
  | 'cpp'
  | 'scala'
  | 'shell'
  | 'dart'
  | 'r'
  | 'terraform'
  | 'dockerfile'
  | 'unknown';

export interface LanguageInfo {
  language: SupportedLanguage;
  extension: string;
  isSupported: boolean;
}

// Mapiranje ekstenzija na jezike
const EXTENSION_TO_LANGUAGE: Record<string, SupportedLanguage> = {
  // JavaScript
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  
  // TypeScript
  '.ts': 'typescript',
  '.tsx': 'typescript',
  
  // Java
  '.java': 'java',
  
  // Python
  '.py': 'python',
  '.pyw': 'python',
  '.pyi': 'python',
  
  // PHP
  '.php': 'php',
  '.phtml': 'php',
  '.php3': 'php',
  '.php4': 'php',
  '.php5': 'php',
  
  // C#
  '.cs': 'csharp',
  '.csx': 'csharp',
  
  // SQL
  '.sql': 'sql',
  
  // Go
  '.go': 'go',
  
  // Ruby
  '.rb': 'ruby',
  '.rbw': 'ruby',
  '.rake': 'ruby',

  // Swift
  '.swift': 'swift',

  // Kotlin
  '.kt': 'kotlin',
  '.kts': 'kotlin',
  '.ktm': 'kotlin',

  // Rust
  '.rs': 'rust',

  // C / C++
  '.c': 'c',
  '.h': 'c',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.hpp': 'cpp',
  '.hxx': 'cpp',

  // Scala
  '.scala': 'scala',
  '.sc': 'scala',

  // Shell
  '.sh': 'shell',
  '.bash': 'shell',
  '.zsh': 'shell',

  // Dart
  '.dart': 'dart',

  // R
  '.r': 'r',
  '.R': 'r',

  // IaC
  '.tf': 'terraform',
  '.tfvars': 'terraform',
};

/**
 * Detektuje jezik po ekstenziji fajla
 * 
 * @param filename - Ime fajla ili putanja (npr. "src/index.ts", "app.jsx")
 * @returns LanguageInfo sa informacijama o jeziku
 */
export function detectLanguage(filename: string): LanguageInfo {
  if (!filename || typeof filename !== 'string') {
    return {
      language: 'unknown',
      extension: '',
      isSupported: false,
    };
  }

  // Dockerfile (nema ekstenziju)
  const base = filename.split('/').pop() ?? '';
  if (base === 'Dockerfile' || base.startsWith('Dockerfile.')) {
    return { language: 'dockerfile', extension: '', isSupported: true };
  }

  const extension = getFileExtension(filename);
  const language = EXTENSION_TO_LANGUAGE[extension.toLowerCase()] || 'unknown';

  return {
    language,
    extension,
    isSupported: language !== 'unknown',
  };
}

/**
 * Ekstraktuje ekstenziju iz filename-a
 * 
 * @param filename - Ime fajla ili putanja
 * @returns Ekstenzija sa tačkom (npr. ".ts", ".jsx")
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  
  if (lastDot === -1 || lastDot === filename.length - 1) {
    return '';
  }
  
  return filename.substring(lastDot);
}

/**
 * Proverava da li je fajl podržan za analizu
 * 
 * @param filename - Ime fajla ili putanja
 * @returns true ako je podržan, false ako nije
 */
export function isLanguageSupported(filename: string): boolean {
  return detectLanguage(filename).isSupported;
}

/**
 * Dobija listu podržanih ekstenzija
 * 
 * @returns Niz ekstenzija koje su podržane
 */
export function getSupportedExtensions(): string[] {
  return Object.keys(EXTENSION_TO_LANGUAGE);
}

/**
 * Dobija listu podržanih jezika
 * 
 * @returns Niz jezika koji su podržani
 */
export function getSupportedLanguages(): SupportedLanguage[] {
  return Array.from(new Set(Object.values(EXTENSION_TO_LANGUAGE)));
}
