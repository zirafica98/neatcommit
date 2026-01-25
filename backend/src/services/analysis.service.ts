/**
 * Analysis Service
 * 
 * Šta radi:
 * - Orkestrira kompletnu analizu koda
 * - Kombinuje sve servise (Language Detector, AST Parser, Security, LLM)
 * - Agregira rezultate
 * - Vraća finalne rezultate
 * 
 * Kako funkcioniše:
 * 1. Detektuje jezik
 * 2. Parsira kod u AST
 * 3. Proverava security probleme
 * 4. Analizira sa AI-om
 * 5. Kombinuje sve rezultate
 */

import { detectLanguage } from '../utils/language-detector';
import { parseCode, CodeStructure } from '../utils/ast-parser';
import { analyzeSecurity, SecurityIssue } from './security.service';
import { analyzeWithLLM, LLMAnalysisResult, LLMIssue } from './llm.service';
import { logger } from '../utils/logger';

export interface AnalysisResult {
  filename: string;
  language: string;
  isSupported: boolean;
  structure?: CodeStructure;
  securityIssues: SecurityIssue[];
  llmAnalysis?: LLMAnalysisResult;
  allIssues: CombinedIssue[];
  summary: string;
  score: number; // 0-100
}

export interface CombinedIssue {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category: 'SECURITY' | 'PERFORMANCE' | 'QUALITY' | 'BEST_PRACTICE' | 'MAINTAINABILITY';
  title: string;
  description: string;
  line?: number;
  column?: number;
  codeSnippet?: string;
  suggestedFix?: string;
  explanation?: string;
  source: 'security' | 'llm'; // Odakle je problem nađen
  cweId?: string;
  owaspCategory?: string;
}

/**
 * Analizira kompletan fajl
 * 
 * @param code - Source code string
 * @param filename - Ime fajla
 * @returns Kompletan rezultat analize
 */
export async function analyzeFile(
  code: string,
  filename: string
): Promise<AnalysisResult> {
  logger.info('Starting file analysis', { filename });

  // 1. Detektuj jezik
  const languageInfo = detectLanguage(filename);
  
  if (!languageInfo.isSupported) {
    logger.debug('Language not supported, skipping analysis', {
      filename,
      language: languageInfo.language,
    });
    
    return {
      filename,
      language: languageInfo.language,
      isSupported: false,
      securityIssues: [],
      allIssues: [],
      summary: `Language ${languageInfo.language} is not supported for analysis`,
      score: 0,
    };
  }

  // 2. Parsiraj kod u AST strukturu
  let structure: CodeStructure;
  try {
    structure = parseCode(code, filename);
    logger.debug('AST parsing completed', {
      filename,
      functions: structure.functions.length,
      classes: structure.classes.length,
      complexity: structure.complexity,
    });
  } catch (error) {
    logger.error('AST parsing failed', {
      filename,
      error: error instanceof Error ? error.message : String(error),
    });
    
    // Nastavi sa analizom bez AST strukture
    structure = {
      functions: [],
      classes: [],
      variables: [],
      imports: [],
      exports: [],
      complexity: 0,
    };
  }

  // 3. Security analiza
  const securityIssues = analyzeSecurity(code, structure, filename);
  logger.debug('Security analysis completed', {
    filename,
    issueCount: securityIssues.length,
  });

  // 4. LLM analiza (AI) - Inteligentno filtriranje za smanjenje troškova
  let llmAnalysis: LLMAnalysisResult | undefined;
  
  // Optimizacija: LLM samo ako:
  // 1. Ima security problema (CRITICAL/HIGH) - LLM može da nađe dodatne
  // 2. Ili je kompleksan kod (>400 linija ili >8 funkcija) - potrebna dublja analiza
  // 3. Ili nema security problema ali je veliki fajl (>300 linija) - možda ima probleme koje Security Service ne vidi
  const codeLines = code.split('\n').length;
  const hasCriticalIssues = securityIssues.some(i => i.severity === 'CRITICAL' || i.severity === 'HIGH');
  const isComplex = codeLines > 400 || structure.functions.length > 8;
  const isLargeFile = codeLines > 300;
  const shouldUseLLM = hasCriticalIssues || isComplex || (securityIssues.length === 0 && isLargeFile);
  
  logger.debug('LLM decision', {
    filename,
    codeLines,
    functions: structure.functions.length,
    hasCriticalIssues,
    isComplex,
    isLargeFile,
    shouldUseLLM,
  });
  
  if (shouldUseLLM) {
    try {
      llmAnalysis = await analyzeWithLLM(code, filename, structure, securityIssues);
      logger.debug('LLM analysis completed', {
        filename,
        score: llmAnalysis.score,
        issueCount: llmAnalysis.issues.length,
        reason: hasCriticalIssues ? 'has-critical-issues' : isComplex ? 'complex-code' : 'large-file',
      });
    } catch (error: any) {
      // Ako je quota exceeded, to nije kritična greška - sistem i dalje radi sa Security Service-om
      const isQuotaExceeded = error?.message?.includes('quota') || 
                              error?.message?.includes('429') ||
                              error?.status === 429;
      
      if (isQuotaExceeded) {
        logger.warn('⚠️ LLM analysis skipped - OpenAI quota exceeded (using Security Service only)', {
          filename,
          note: 'Analysis continues with Security Service - no LLM insights available',
        });
      } else {
        logger.error('❌ LLM analysis failed', {
          filename,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      // Nastavi bez LLM analize
    }
  } else {
    logger.debug('LLM analysis skipped (cost optimization)', {
      filename,
      reason: 'no-critical-issues-and-simple-code',
      securityIssues: securityIssues.length,
      codeLines: code.split('\n').length,
      functions: structure.functions.length,
    });
  }

  // 5. Kombinuj sve rezultate
  const allIssues = combineIssues(securityIssues, llmAnalysis?.issues || []);
  const score = calculateScore(securityIssues, llmAnalysis);
  const summary = generateSummary(structure, securityIssues, llmAnalysis);

  logger.info('File analysis completed', {
    filename,
    totalIssues: allIssues.length,
    score,
  });

  return {
    filename,
    language: languageInfo.language,
    isSupported: true,
    structure,
    securityIssues,
    llmAnalysis,
    allIssues,
    summary,
    score,
  };
}

/**
 * Kombinuje security i LLM issue-e
 */
function combineIssues(
  securityIssues: SecurityIssue[],
  llmIssues: LLMIssue[]
): CombinedIssue[] {
  const combined: CombinedIssue[] = [];

  // Dodaj security issue-e
  securityIssues.forEach((issue) => {
    combined.push({
      severity: issue.severity,
      category: issue.category,
      title: issue.title,
      description: issue.description,
      line: issue.line,
      column: issue.column,
      codeSnippet: issue.codeSnippet,
      suggestedFix: issue.suggestedFix,
      source: 'security',
      cweId: issue.cweId,
      owaspCategory: issue.owaspCategory,
    });
  });

  // Dodaj LLM issue-e (izbegni duplikate)
  llmIssues.forEach((issue) => {
    // Proveri da li već postoji sličan issue
    const isDuplicate = combined.some((existing) => {
      return (
        existing.line === issue.line &&
        existing.title.toLowerCase() === issue.title.toLowerCase()
      );
    });

    if (!isDuplicate) {
      combined.push({
        severity: issue.severity,
        category: issue.category,
        title: issue.title,
        description: issue.description,
        line: issue.line,
        suggestedFix: issue.suggestedFix,
        explanation: issue.explanation,
        source: 'llm',
      });
    }
  });

  // Sortiraj po severity (CRITICAL prvo)
  const severityOrder = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
    INFO: 4,
  };

  return combined.sort((a, b) => {
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

/**
 * Izračunava overall score (0-100)
 */
function calculateScore(
  securityIssues: SecurityIssue[],
  llmAnalysis?: LLMAnalysisResult
): number {
  let score = 100;

  // Oduzmi poeni za security probleme
  securityIssues.forEach((issue) => {
    switch (issue.severity) {
      case 'CRITICAL':
        score -= 20;
        break;
      case 'HIGH':
        score -= 10;
        break;
      case 'MEDIUM':
        score -= 5;
        break;
      case 'LOW':
        score -= 2;
        break;
    }
  });

  // Kombinuj sa LLM score-om (ako postoji)
  if (llmAnalysis) {
    const llmScore = llmAnalysis.score || 0;
    // Weighted average: 60% LLM score, 40% security score
    score = Math.round(llmScore * 0.6 + score * 0.4);
  }

  // Osiguraj da je između 0 i 100
  return Math.max(0, Math.min(100, score));
}

/**
 * Generiše summary tekst
 */
function generateSummary(
  structure: CodeStructure,
  securityIssues: SecurityIssue[],
  llmAnalysis?: LLMAnalysisResult
): string {
  const parts: string[] = [];

  // Struktura
  parts.push(`Found ${structure.functions.length} functions, ${structure.classes.length} classes`);
  
  if (structure.complexity > 10) {
    parts.push(`High complexity (${structure.complexity})`);
  }

  // Security
  if (securityIssues.length > 0) {
    const critical = securityIssues.filter((i) => i.severity === 'CRITICAL').length;
    const high = securityIssues.filter((i) => i.severity === 'HIGH').length;
    
    if (critical > 0) {
      parts.push(`${critical} CRITICAL security issues`);
    }
    if (high > 0) {
      parts.push(`${high} HIGH security issues`);
    }
  } else {
    parts.push('No security issues detected');
  }

  // LLM summary
  if (llmAnalysis?.summary) {
    parts.push(llmAnalysis.summary);
  }

  return parts.join('. ') + '.';
}

/**
 * Analizira više fajlova odjednom
 * 
 * @param files - Array sa { code, filename }
 * @returns Rezultati za sve fajlove
 */
export async function analyzeFiles(
  files: Array<{ code: string; filename: string }>
): Promise<AnalysisResult[]> {
  logger.info('Starting multi-file analysis', { fileCount: files.length });

  const results: AnalysisResult[] = [];

  // Analiziraj fajlove paralelno (do 5 istovremeno)
  const batchSize = 5;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((file) => analyzeFile(file.code, file.filename))
    );
    results.push(...batchResults);
  }

  logger.info('Multi-file analysis completed', {
    totalFiles: files.length,
    analyzedFiles: results.filter((r) => r.isSupported).length,
  });

  return results;
}
