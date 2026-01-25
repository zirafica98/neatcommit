/**
 * Comment Formatter
 * 
 * Šta radi:
 * - Formatira rezultate analize u Markdown komentare
 * - Kreira summary komentar
 * - Kreira inline komentare za specifične linije
 * 
 * Kako funkcioniše:
 * 1. Uzima rezultate analize
 * 2. Formatira u Markdown
 * 3. Dodaje emoji ikone i boje
 * 4. Vraća formatiran tekst
 */

import { AnalysisResult } from '../services/analysis.service';
import { CombinedIssue } from '../services/analysis.service';

/**
 * Formatira summary komentar za PR
 * 
 * @param results - Rezultati analize za sve fajlove
 * @param prNumber - PR broj
 * @returns Markdown formatiran summary komentar
 */
export function formatSummaryComment(
  results: AnalysisResult[],
  prNumber: number
): string {
  const totalFiles = results.length;
  const analyzedFiles = results.filter((r) => r.isSupported).length;
  const allIssues = results.flatMap((r) => r.allIssues);
  
  const criticalCount = allIssues.filter((i) => i.severity === 'CRITICAL').length;
  const highCount = allIssues.filter((i) => i.severity === 'HIGH').length;
  const mediumCount = allIssues.filter((i) => i.severity === 'MEDIUM').length;
  const lowCount = allIssues.filter((i) => i.severity === 'LOW').length;
  
  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  const scoreEmoji = getScoreEmoji(avgScore);

  let comment = `## 🔍 Code Analysis Results for PR #${prNumber}\n\n`;
  
  comment += `${scoreEmoji} **Security Score: ${Math.round(avgScore)}/100**\n\n`;
  
  comment += `### 📊 Summary\n\n`;
  comment += `- **Files Analyzed:** ${analyzedFiles}/${totalFiles}\n`;
  comment += `- **Total Issues:** ${allIssues.length}\n`;
  comment += `- **Critical:** ${criticalCount} | **High:** ${highCount} | **Medium:** ${mediumCount} | **Low:** ${lowCount}\n\n`;

  if (criticalCount > 0 || highCount > 0) {
    comment += `### ⚠️ Critical & High Priority Issues\n\n`;
    
    const criticalAndHigh = allIssues
      .filter((i) => i.severity === 'CRITICAL' || i.severity === 'HIGH')
      .slice(0, 10); // Prvih 10
    
    // Grupiši issue-e po fajlovima
    const issuesByFile = new Map<string, CombinedIssue[]>();
    results.forEach((result) => {
      result.allIssues
        .filter((i) => i.severity === 'CRITICAL' || i.severity === 'HIGH')
        .forEach((issue) => {
          const fileIssues = issuesByFile.get(result.filename) || [];
          fileIssues.push(issue);
          issuesByFile.set(result.filename, fileIssues);
        });
    });

    let issueIndex = 1;
    issuesByFile.forEach((fileIssues, filename) => {
      fileIssues.forEach((issue) => {
        const severityBadge = getSeverityBadge(issue.severity);
        comment += `${issueIndex}. ${severityBadge} **${issue.title}**\n`;
        comment += `   - File: \`${filename}\`${issue.line ? ` (line ${issue.line})` : ''}\n`;
        comment += `   - ${issue.description}\n`;
        
        if (issue.suggestedFix) {
          comment += `   - 💡 **Fix:** ${issue.suggestedFix}\n`;
        }
        
        comment += `\n`;
        issueIndex++;
      });
    });

    if (criticalAndHigh.length < criticalCount + highCount) {
      comment += `*... and ${criticalCount + highCount - criticalAndHigh.length} more critical/high issues*\n\n`;
    }
  }

  if (allIssues.length === 0) {
    comment += `### ✅ No Issues Found\n\n`;
    comment += `Great job! No security or quality issues detected.\n\n`;
  }

  comment += `---\n\n`;
  comment += `*This analysis was performed automatically by Elementer AI Code Review*\n`;

  return comment;
}

/**
 * Formatira inline komentar za specifičnu liniju koda
 * 
 * @param issue - Issue koji se komentariše
 * @param codeSnippet - Snippet koda (opciono)
 * @returns Markdown formatiran inline komentar
 */
export function formatInlineComment(
  issue: CombinedIssue,
  codeSnippet?: string
): string {
  const severityBadge = getSeverityBadge(issue.severity);

  let comment = `${severityBadge} **${issue.title}**\n\n`;
  
  comment += `${issue.description}\n\n`;

  if (codeSnippet) {
    comment += `\`\`\`typescript\n${codeSnippet}\n\`\`\`\n\n`;
  }

  if (issue.suggestedFix) {
    comment += `### 💡 Suggested Fix\n\n`;
    comment += `${issue.suggestedFix}\n\n`;
  }

  if (issue.explanation) {
    comment += `### 📝 Explanation\n\n`;
    comment += `${issue.explanation}\n\n`;
  }

  if (issue.cweId) {
    comment += `**CWE:** ${issue.cweId}\n`;
  }

  if (issue.owaspCategory) {
    comment += `**OWASP:** ${issue.owaspCategory}\n`;
  }

  comment += `\n---\n`;
  comment += `*Detected by ${issue.source === 'security' ? 'Security Scanner' : 'AI Analysis'}*\n`;

  return comment;
}

/**
 * Vraća emoji za score
 */
function getScoreEmoji(score: number): string {
  if (score >= 90) return '🟢';
  if (score >= 70) return '🟡';
  if (score >= 50) return '🟠';
  return '🔴';
}

/**
 * Vraća badge za severity
 */
function getSeverityBadge(severity: CombinedIssue['severity']): string {
  const badges = {
    CRITICAL: '🔴 **CRITICAL**',
    HIGH: '🟠 **HIGH**',
    MEDIUM: '🟡 **MEDIUM**',
    LOW: '🟢 **LOW**',
    INFO: 'ℹ️ **INFO**',
  };
  return badges[severity];
}


/**
 * Formatira komentar za fajl sa više issue-a
 * 
 * @param filename - Ime fajla
 * @param issues - Lista issue-a za taj fajl
 * @returns Markdown formatiran komentar
 */
export function formatFileComment(
  filename: string,
  issues: CombinedIssue[]
): string {
  if (issues.length === 0) {
    return '';
  }

  const criticalCount = issues.filter((i) => i.severity === 'CRITICAL').length;
  const highCount = issues.filter((i) => i.severity === 'HIGH').length;

  let comment = `## 📄 Analysis Results for \`${filename}\`\n\n`;
  
  comment += `Found **${issues.length} issue(s)**: `;
  comment += `${criticalCount > 0 ? `${criticalCount} critical` : ''}`;
  comment += `${criticalCount > 0 && highCount > 0 ? ', ' : ''}`;
  comment += `${highCount > 0 ? `${highCount} high` : ''}`;
  comment += `\n\n`;

  // Grupiši issue-e po linijama
  const issuesByLine = new Map<number, CombinedIssue[]>();
  issues.forEach((issue) => {
    if (issue.line) {
      const lineIssues = issuesByLine.get(issue.line) || [];
      lineIssues.push(issue);
      issuesByLine.set(issue.line, lineIssues);
    }
  });

  // Prikaži issue-e po linijama
  Array.from(issuesByLine.entries())
    .sort(([a], [b]) => a - b)
    .forEach(([line, lineIssues]) => {
      comment += `### Line ${line}\n\n`;
      
      lineIssues.forEach((issue) => {
        const severityBadge = getSeverityBadge(issue.severity);
        comment += `${severityBadge} **${issue.title}**\n`;
        comment += `${issue.description}\n`;
        
        if (issue.suggestedFix) {
          comment += `💡 **Fix:** ${issue.suggestedFix}\n`;
        }
        
        comment += `\n`;
      });
    });

  return comment;
}
