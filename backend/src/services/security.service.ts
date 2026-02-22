/**
 * Security Service
 * 
 * Šta radi:
 * - Proverava kod za osnovne security probleme
 * - Detektuje poznate security pattern-e
 * - OWASP Top 10 checks
 * - CWE (Common Weakness Enumeration) patterns
 * 
 * Kako funkcioniše:
 * 1. Uzima source code i AST strukturu
 * 2. Proverava kod za poznate security pattern-e
 * 3. Vraća listu nađenih problema
 */

import { CodeStructure } from '../utils/ast-parser';
import { logger } from '../utils/logger';
import { detectLanguage } from '../utils/language-detector';
import { getSecurityPatterns, getPatternId } from './security-patterns';

export interface SecurityIssue {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'SECURITY' | 'PERFORMANCE' | 'QUALITY' | 'BEST_PRACTICE';
  title: string;
  description: string;
  line: number;
  column?: number;
  codeSnippet?: string;
  suggestedFix?: string;
  cweId?: string;
  owaspCategory?: string;
  ruleId?: string;
}

/**
 * Analizira kod za security probleme
 * 
 * @param code - Source code string
 * @param structure - AST struktura koda
 * @param filename - Ime fajla
 * @returns Lista security problema
 */
export function analyzeSecurity(
  code: string,
  _structure: CodeStructure,
  filename: string
): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  const languageInfo = detectLanguage(filename);
  const language = languageInfo.language;

  // Koristi jezik-specifične pattern-e
  const patterns = getSecurityPatterns(language);
  const lines = code.split('\n');

  // Proveri svaki pattern
  lines.forEach((line, index) => {
    patterns.forEach((pattern) => {
      // Reset regex lastIndex za svaki test
      pattern.pattern.lastIndex = 0;
      
      if (pattern.pattern.test(line)) {
        issues.push({
          severity: pattern.severity,
          category: pattern.category,
          title: pattern.name,
          description: pattern.description,
          line: index + 1,
          codeSnippet: line.trim(),
          suggestedFix: pattern.suggestedFix,
          cweId: pattern.cweId,
          owaspCategory: pattern.owaspCategory,
          ruleId: getPatternId(pattern),
        });
      }
    });
  });

  logger.debug('Security analysis completed', {
    filename,
    language,
    patternCount: patterns.length,
    issueCount: issues.length,
  });

  return issues;
}

// Stare funkcije su zamenjene sa jezik-specifičnim pattern-ima u security-patterns.ts
// Ove funkcije su zadržane za backward compatibility, ali se ne koriste
// (Security analiza sada koristi getSecurityPatterns() iz security-patterns.ts)
