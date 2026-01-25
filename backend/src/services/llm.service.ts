/**
 * LLM Service
 * 
 * Šta radi:
 * - Komunikacija sa OpenAI API-jem
 * - AI analiza koda
 * - Generisanje code review komentara
 * - Prompt engineering za bolje rezultate
 * 
 * Kako funkcioniše:
 * 1. Prima kod i kontekst
 * 2. Gradi prompt sa instrukcijama
 * 3. Poziva OpenAI API
 * 4. Parsira odgovor
 * 5. Vraća strukturirane rezultate
 */

import OpenAI from 'openai';
import env from '../config/env';
import { logger } from '../utils/logger';
import { CodeStructure } from '../utils/ast-parser';
import { SecurityIssue } from './security.service';

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

// Cost optimization: Koristi GPT-3.5-turbo umesto GPT-4 (10x jeftinije)
// Može se promeniti preko env varijable
const LLM_MODEL = process.env.LLM_MODEL || 'gpt-3.5-turbo'; // 'gpt-4-turbo-preview' za bolje rezultate
const MAX_TOKENS = parseInt(process.env.LLM_MAX_TOKENS || '1000', 10); // Smanjeno sa 2000
const MAX_CODE_LINES = parseInt(process.env.LLM_MAX_CODE_LINES || '2000', 10); // Ograniči veličinu koda

export interface LLMAnalysisResult {
  summary: string;
  issues: LLMIssue[];
  suggestions: string[];
  score: number; // 0-100, gde 100 je savršeno
}

export interface LLMIssue {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category: 'SECURITY' | 'PERFORMANCE' | 'QUALITY' | 'BEST_PRACTICE' | 'MAINTAINABILITY';
  title: string;
  description: string;
  line?: number;
  suggestedFix?: string;
  explanation?: string;
}

/**
 * Analizira kod sa AI-om
 * 
 * @param code - Source code string
 * @param filename - Ime fajla
 * @param structure - AST struktura koda
 * @param securityIssues - Već nađeni security problemi
 * @returns LLM analiza rezultata
 */
export async function analyzeWithLLM(
  code: string,
  filename: string,
  structure: CodeStructure,
  securityIssues: SecurityIssue[]
): Promise<LLMAnalysisResult> {
  try {
    const prompt = buildAnalysisPrompt(code, filename, structure, securityIssues);

    logger.debug('Sending code to OpenAI for analysis', {
      filename,
      codeLength: code.length,
      functionCount: structure.functions.length,
      classCount: structure.classes.length,
    });

    const response = await openai.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        {
          role: 'system',
          content: getSystemPrompt(),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Niža temperatura = konzistentniji odgovori
      max_tokens: MAX_TOKENS,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    logger.debug('OpenAI analysis completed', {
      filename,
      tokensUsed: response.usage?.total_tokens,
    });

    return parseLLMResponse(content);
  } catch (error: any) {
    // Ako je quota exceeded, to nije kritična greška
    const isQuotaExceeded = error?.message?.includes('quota') || 
                            error?.message?.includes('429') ||
                            error?.status === 429;
    
    if (isQuotaExceeded) {
      logger.warn('⚠️ LLM analysis skipped - OpenAI quota exceeded', {
        filename,
        note: 'Security Service analysis will still run',
      });
    } else {
      logger.error('❌ LLM analysis failed', {
        filename,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    
    // Vrati prazan rezultat ako nešto padne
    return {
      summary: 'AI analysis unavailable',
      issues: [],
      suggestions: [],
      score: 0,
    };
  }
}

/**
 * Gradi prompt za AI analizu (optimizovano za manje tokena)
 */
function buildAnalysisPrompt(
  code: string,
  filename: string,
  structure: CodeStructure,
  securityIssues: SecurityIssue[]
): string {
  // Detektuj jezik
  const ext = filename.substring(filename.lastIndexOf('.'));
  const languageMap: Record<string, string> = {
    '.js': 'JavaScript', '.jsx': 'JavaScript',
    '.ts': 'TypeScript', '.tsx': 'TypeScript',
    '.java': 'Java', '.py': 'Python', '.php': 'PHP',
    '.cs': 'C#', '.sql': 'SQL', '.go': 'Go', '.rb': 'Ruby',
  };
  const language = languageMap[ext] || 'code';
  
  // Optimizacija: Ograniči kod na max linija (smanjuje token-e)
  const codeLines = code.split('\n');
  let optimizedCode = code;
  if (codeLines.length > MAX_CODE_LINES) {
    // Uzmi prve MAX_CODE_LINES linija + poslednje 100 (za kontekst)
    const firstPart = codeLines.slice(0, MAX_CODE_LINES - 100).join('\n');
    const lastPart = codeLines.slice(-100).join('\n');
    optimizedCode = `${firstPart}\n\n// ... (${codeLines.length - MAX_CODE_LINES} lines omitted) ...\n\n${lastPart}`;
    logger.debug('Code truncated for LLM', {
      filename,
      originalLines: codeLines.length,
      truncatedLines: MAX_CODE_LINES,
    });
  }
  
  // Optimizovani prompt (kraći, fokusiraniji)
  let prompt = `Review ${language} code:\n\n`;
  prompt += `File: ${filename}\n`;
  prompt += `Stats: ${structure.functions.length} funcs, ${structure.classes.length} classes, complexity ${structure.complexity}\n`;
  
  // Dodaj samo kritične security probleme
  const criticalIssues = securityIssues.filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH');
  if (criticalIssues.length > 0) {
    prompt += `Security issues found: ${criticalIssues.length}\n`;
    criticalIssues.slice(0, 2).forEach((issue) => {
      prompt += `- ${issue.title} (line ${issue.line})\n`;
    });
    prompt += '\n';
  }
  
  // Dodaj kod
  prompt += `Code:\n\`\`\`\n${optimizedCode}\n\`\`\`\n\n`;
  
  // Kraći instrukcije
  prompt += `Find issues Security Service missed. JSON format:\n`;
  prompt += `{"summary":"...","issues":[{"severity":"HIGH","category":"SECURITY","title":"...","description":"...","line":42,"suggestedFix":"..."}],"suggestions":["..."],"score":85}\n`;

  return prompt;
}

/**
 * System prompt za OpenAI
 */
function getSystemPrompt(): string {
  return `You are an expert code reviewer specializing in JavaScript and TypeScript. 
Your role is to analyze code and provide constructive feedback focusing on:
- Security vulnerabilities
- Performance issues
- Code quality and maintainability
- Best practices
- Potential bugs

Be specific, actionable, and professional in your feedback. Always provide line numbers when possible.`;
}

/**
 * Parsira LLM odgovor u strukturirani format
 */
function parseLLMResponse(content: string): LLMAnalysisResult {
  try {
    // Pokušaj da ekstraktuješ JSON iz odgovora
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        summary: parsed.summary || 'No summary provided',
        issues: parsed.issues || [],
        suggestions: parsed.suggestions || [],
        score: parsed.score || 0,
      };
    }
    
    // Fallback ako nema JSON
    logger.warn('Could not parse LLM response as JSON, using fallback');
    return {
      summary: content.substring(0, 200),
      issues: [],
      suggestions: [],
      score: 0,
    };
  } catch (error) {
    logger.error('Failed to parse LLM response', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    return {
      summary: 'Failed to parse AI response',
      issues: [],
      suggestions: [],
      score: 0,
    };
  }
}

/**
 * Analizira samo određeni deo koda (za inline komentare)
 * 
 * @param codeSnippet - Mali deo koda
 * @param context - Kontekst oko koda
 * @param lineNumber - Linija gde je kod
 * @returns LLM analiza za taj deo
 */
export async function analyzeCodeSnippet(
  codeSnippet: string,
  context: string,
  lineNumber: number
): Promise<LLMIssue[]> {
  try {
    const prompt = `Analyze this specific code snippet and identify any issues:\n\n` +
      `Context:\n\`\`\`\n${context}\n\`\`\`\n\n` +
      `Code at line ${lineNumber}:\n\`\`\`\n${codeSnippet}\n\`\`\`\n\n` +
      `Provide issues in JSON format: [{"severity": "HIGH", "category": "SECURITY", "title": "...", "description": "...", "suggestedFix": "..."}]`;

    const response = await openai.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        {
          role: 'system',
          content: getSystemPrompt(),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: MAX_TOKENS,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return [];
    }

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return [];
  } catch (error) {
    logger.error('Code snippet analysis failed', {
      lineNumber,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}
