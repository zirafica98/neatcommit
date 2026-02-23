/**
 * Maintainability grade (A–F) and technical debt (remediation minutes).
 * CodeClimate-style metrics derived from issue counts.
 */

export type MaintainabilityGrade = 'A' | 'B' | 'C' | 'D' | 'F';

/** Minutes per issue by severity (configurable) */
const DEFAULT_MINUTES: Record<string, number> = {
  CRITICAL: 60,
  HIGH: 30,
  MEDIUM: 15,
  LOW: 5,
  INFO: 2,
};

/** Grade thresholds: max remediation minutes for each letter */
const GRADE_THRESHOLDS: { maxMinutes: number; grade: MaintainabilityGrade }[] = [
  { maxMinutes: 30, grade: 'A' },
  { maxMinutes: 60, grade: 'B' },
  { maxMinutes: 120, grade: 'C' },
  { maxMinutes: 240, grade: 'D' },
  { maxMinutes: Number.MAX_SAFE_INTEGER, grade: 'F' },
];

export interface IssueCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

/**
 * Compute total estimated remediation time in minutes from issue counts.
 */
export function computeRemediationMinutes(counts: IssueCounts): number {
  return (
    counts.critical * DEFAULT_MINUTES.CRITICAL +
    counts.high * DEFAULT_MINUTES.HIGH +
    counts.medium * DEFAULT_MINUTES.MEDIUM +
    counts.low * DEFAULT_MINUTES.LOW +
    counts.info * DEFAULT_MINUTES.INFO
  );
}

/**
 * Map remediation minutes to a letter grade (A–F).
 */
export function computeMaintainabilityGrade(remediationMinutes: number): MaintainabilityGrade {
  for (const { maxMinutes, grade } of GRADE_THRESHOLDS) {
    if (remediationMinutes <= maxMinutes) return grade;
  }
  return 'F';
}
