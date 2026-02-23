/**
 * Repository configuration (.neatcommit.yml)
 *
 * Parses and validates repo-level config for categories, quality gate, and ignore paths.
 */

import yaml from 'js-yaml';
import { minimatch } from 'minimatch';
import { logger } from '../utils/logger';

export interface RepoConfigCategories {
  security?: boolean;
  quality?: boolean;
  style?: boolean;
  performance?: boolean;
  bestPractice?: boolean;
}

export interface RepoConfigQualityGate {
  blockOnCritical?: boolean;
  minScore?: number;
}

export interface RepoConfigIgnore {
  paths?: string[];
}

export interface RepoConfigRules {
  disable?: string[];
  severityOverrides?: Record<string, string>;
}

export interface RepoConfigDuplication {
  minLines?: number;        // minimum block size (default 8)
  ignorePatterns?: string[]; // globs for file paths to skip duplication check
}

export interface RepoConfig {
  categories?: RepoConfigCategories;
  qualityGate?: RepoConfigQualityGate;
  ignore?: RepoConfigIgnore;
  rules?: RepoConfigRules;
  duplication?: RepoConfigDuplication;
}

const DEFAULT_CONFIG: RepoConfig = {
  categories: {
    security: true,
    quality: true,
    style: true,
    performance: true,
    bestPractice: true,
  },
  qualityGate: {
    blockOnCritical: true,
    minScore: undefined,
  },
  ignore: {
    paths: [],
  },
  duplication: {
    minLines: 8,
    ignorePatterns: [],
  },
};

/**
 * Parse raw YAML string into RepoConfig. Returns default config on parse error or invalid content.
 */
export function parseRepoConfig(rawYaml: string | null): RepoConfig {
  if (!rawYaml || typeof rawYaml !== 'string' || !rawYaml.trim()) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const parsed = yaml.load(rawYaml) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_CONFIG };
    }

    const config: RepoConfig = {
      categories: mergeCategories((parsed as any).categories),
      qualityGate: mergeQualityGate((parsed as any).qualityGate),
      ignore: mergeIgnore((parsed as any).ignore),
      rules: mergeRules((parsed as any).rules),
      duplication: mergeDuplication((parsed as any).duplication),
    };

    return config;
  } catch (err) {
    logger.warn('Failed to parse .neatcommit.yml, using defaults', {
      error: err instanceof Error ? err.message : String(err),
    });
    return { ...DEFAULT_CONFIG };
  }
}

function mergeCategories(categories: unknown): RepoConfigCategories {
  const out = { ...DEFAULT_CONFIG.categories };
  if (!categories || typeof categories !== 'object') return out as RepoConfigCategories;
  const c = categories as Record<string, boolean>;
  if (typeof c.security === 'boolean') out!.security = c.security;
  if (typeof c.quality === 'boolean') out!.quality = c.quality;
  if (typeof c.style === 'boolean') out!.style = c.style;
  if (typeof c.performance === 'boolean') out!.performance = c.performance;
  if (typeof c.bestPractice === 'boolean') out!.bestPractice = c.bestPractice;
  return out as RepoConfigCategories;
}

function mergeQualityGate(qualityGate: unknown): RepoConfigQualityGate {
  const out = { ...DEFAULT_CONFIG.qualityGate };
  if (!qualityGate || typeof qualityGate !== 'object') return out as RepoConfigQualityGate;
  const q = qualityGate as Record<string, unknown>;
  if (typeof q.blockOnCritical === 'boolean') out!.blockOnCritical = q.blockOnCritical;
  if (typeof q.minScore === 'number' && q.minScore >= 0 && q.minScore <= 100) out!.minScore = q.minScore;
  return out as RepoConfigQualityGate;
}

function mergeIgnore(ignore: unknown): RepoConfigIgnore {
  const out = { ...DEFAULT_CONFIG.ignore };
  if (!ignore || typeof ignore !== 'object') return out as RepoConfigIgnore;
  const i = ignore as Record<string, unknown>;
  if (Array.isArray(i.paths)) {
    out!.paths = i.paths.filter((p): p is string => typeof p === 'string');
  }
  return out as RepoConfigIgnore;
}

function mergeDuplication(duplication: unknown): RepoConfigDuplication {
  const out = { ...DEFAULT_CONFIG.duplication };
  if (!duplication || typeof duplication !== 'object') return out as RepoConfigDuplication;
  const d = duplication as Record<string, unknown>;
  if (typeof d.minLines === 'number' && d.minLines >= 3 && d.minLines <= 20) {
    out!.minLines = d.minLines;
  }
  if (Array.isArray(d.ignorePatterns)) {
    out!.ignorePatterns = d.ignorePatterns.filter((p): p is string => typeof p === 'string');
  }
  return out as RepoConfigDuplication;
}

function mergeRules(rules: unknown): RepoConfigRules | undefined {
  if (!rules || typeof rules !== 'object') return undefined;
  const r = rules as Record<string, unknown>;
  const out: RepoConfigRules = {};
  if (Array.isArray(r.disable)) {
    out.disable = r.disable.filter((x): x is string => typeof x === 'string');
  }
  if (r.severityOverrides && typeof r.severityOverrides === 'object') {
    const so = r.severityOverrides as Record<string, unknown>;
    out.severityOverrides = {};
    for (const [k, v] of Object.entries(so)) {
      if (typeof v === 'string' && ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].includes(v)) {
        out.severityOverrides![k] = v;
      }
    }
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * Check if a file path should be ignored based on config.ignore.paths (glob patterns).
 */
export function isPathIgnored(filePath: string, config: RepoConfig): boolean {
  const paths = config.ignore?.paths ?? [];
  if (paths.length === 0) return false;
  return paths.some((pattern) => minimatch(filePath, pattern, { matchBase: true }));
}

/**
 * Map category string (from issues) to config key. Issue categories: SECURITY, PERFORMANCE, QUALITY, BEST_PRACTICE.
 */
export function isCategoryEnabled(category: string, config: RepoConfig): boolean {
  const categories = config.categories ?? DEFAULT_CONFIG.categories ?? {};
  const map: Record<string, keyof RepoConfigCategories> = {
    SECURITY: 'security',
    PERFORMANCE: 'performance',
    QUALITY: 'quality',
    BEST_PRACTICE: 'bestPractice',
    MAINTAINABILITY: 'quality',
  };
  const key = map[category] ?? 'quality';
  const value = categories[key];
  return value !== false;
}

/**
 * Filter issue list by config categories.
 */
export function filterIssuesByCategories<T extends { category: string }>(
  issues: T[],
  config: RepoConfig
): T[] {
  return issues.filter((issue) => isCategoryEnabled(issue.category, config));
}

/**
 * Apply rules config: filter disabled rule ids and apply severity overrides (by ruleId or title).
 */
export function applyRulesConfig<T extends { ruleId?: string; title: string; severity: string }>(
  issues: T[],
  config: RepoConfig
): T[] {
  const rules = config.rules;
  if (
    !rules?.disable?.length &&
    (!rules?.severityOverrides || typeof rules.severityOverrides !== 'object' || !Object.keys(rules.severityOverrides).length)
  ) {
    return issues;
  }
  const disableSet = new Set((rules.disable ?? []).map((id) => id.toLowerCase()));
  let result = issues.filter((issue) => {
    const id = issue.ruleId ?? issue.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return !disableSet.has(id);
  });
  const overrides = rules.severityOverrides ?? {};
  if (Object.keys(overrides).length > 0) {
    result = result.map((issue) => {
      const override =
        overrides[issue.ruleId ?? ''] ?? overrides[issue.title];
      if (!override) return issue;
      return { ...issue, severity: override as T['severity'] };
    });
  }
  return result;
}

/**
 * Compute whether the quality gate passes given issue counts and average score.
 */
export function computeQualityGatePassed(
  config: RepoConfig,
  criticalCount: number,
  avgScore: number
): boolean {
  const gate = config.qualityGate ?? DEFAULT_CONFIG.qualityGate;
  if (gate!.blockOnCritical && criticalCount > 0) return false;
  if (typeof gate!.minScore === 'number' && avgScore < gate!.minScore!) return false;
  return true;
}
