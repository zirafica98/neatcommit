/**
 * Quality Service
 *
 * Detects code smells (long functions, too many params, high complexity)
 * and duplicate code blocks. Duplication supports config from .neatcommit.yml.
 */

import { minimatch } from 'minimatch';
import { CodeStructure } from '../utils/ast-parser';
import { logger } from '../utils/logger';
import type { RepoConfigDuplication } from '../config/repo-config';

export interface QualityIssue {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category: 'QUALITY' | 'MAINTAINABILITY';
  title: string;
  description: string;
  line?: number;
  suggestedFix?: string;
}

const MAX_PARAMS = 4;
const HIGH_COMPLEXITY = 15;
const DEFAULT_DUPLICATE_BLOCK_LINES = 8;
const MAX_DUPLICATE_ISSUES = 8;

/**
 * Code smell checks using AST structure (JS/TS). Returns issues for too many params and high complexity.
 */
export function analyzeCodeSmells(
  _code: string,
  structure: CodeStructure,
  filename: string
): QualityIssue[] {
  const issues: QualityIssue[] = [];

  for (const fn of structure.functions) {
    if (fn.params.length > MAX_PARAMS) {
      issues.push({
        severity: 'LOW',
        category: 'MAINTAINABILITY',
        title: 'Too many parameters',
        description: `Function "${fn.name}" has ${fn.params.length} parameters. Consider using an options object or breaking the function.`,
        line: fn.line,
        suggestedFix: 'Reduce parameters (e.g. use options object or split function)',
      });
    }
    if (fn.complexity >= HIGH_COMPLEXITY) {
      issues.push({
        severity: 'MEDIUM',
        category: 'MAINTAINABILITY',
        title: 'High cyclomatic complexity',
        description: `Function "${fn.name}" has complexity ${fn.complexity}. Consider simplifying or splitting.`,
        line: fn.line,
        suggestedFix: 'Extract branches into smaller functions or simplify conditionals',
      });
    }
  }

  logger.debug('Code smells analysis', { filename, issues: issues.length });
  return issues;
}

/**
 * Duplicate detection: normalizes consecutive line blocks, hashes them, reports duplicates.
 * Uses config.minLines (default 8) and skips files matching config.ignorePatterns.
 */
export function analyzeDuplicates(
  code: string,
  filename: string,
  config?: RepoConfigDuplication | null
): QualityIssue[] {
  const blockSize = config?.minLines ?? DEFAULT_DUPLICATE_BLOCK_LINES;
  const ignorePatterns = config?.ignorePatterns ?? [];
  if (ignorePatterns.length > 0 && ignorePatterns.some((p) => minimatch(filename, p, { matchBase: true }))) {
    return [];
  }

  const lines = code.split(/\r?\n/);
  const normalizedToFirstLine = new Map<string, number[]>();

  for (let i = 0; i <= lines.length - blockSize; i++) {
    const block = lines.slice(i, i + blockSize);
    const normalized = block
      .map((l) => l.trim().replace(/\s+/g, ' '))
      .filter((l) => l.length > 0)
      .join('\n');
    if (normalized.length < 20) continue;
    const key = normalized;
    if (!normalizedToFirstLine.has(key)) {
      normalizedToFirstLine.set(key, []);
    }
    normalizedToFirstLine.get(key)!.push(i + 1);
  }

  const issues: QualityIssue[] = [];
  for (const [, lineNumbers] of normalizedToFirstLine) {
    if (lineNumbers.length >= 2 && issues.length < MAX_DUPLICATE_ISSUES) {
      issues.push({
        severity: 'LOW',
        category: 'QUALITY',
        title: 'Duplicate code block',
        description: `Similar ${blockSize}-line block appears ${lineNumbers.length} times (e.g. lines ${lineNumbers.slice(0, 3).join(', ')}). Consider extracting to a function.`,
        line: lineNumbers[0],
        suggestedFix: 'Extract duplicated logic into a shared function or module',
      });
    }
  }

  logger.debug('Duplicate analysis', { filename, blockSize, issues: issues.length });
  return issues;
}

/**
 * Runs code smell and duplicate checks. Returns issues compatible with CombinedIssue (category QUALITY/MAINTAINABILITY).
 * Pass duplication config from repo .neatcommit.yml for configurable block size and ignore patterns.
 */
export function analyzeQuality(
  code: string,
  structure: CodeStructure,
  filename: string,
  duplicationConfig?: RepoConfigDuplication | null
): QualityIssue[] {
  const smellIssues = analyzeCodeSmells(code, structure, filename);
  const duplicateIssues = analyzeDuplicates(code, filename, duplicationConfig);
  return [...smellIssues, ...duplicateIssues];
}
