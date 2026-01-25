/**
 * AST Parser
 * 
 * Šta radi:
 * - Parsira JavaScript/TypeScript kod u AST (Abstract Syntax Tree)
 * - Ekstraktuje strukturu koda (funkcije, klase, varijable, itd.)
 * - Detektuje potencijalne probleme u strukturi
 * 
 * Kako funkcioniše:
 * 1. Uzima source code string
 * 2. Koristi Babel parser da kreira AST
 * 3. Analizira AST i ekstraktuje informacije
 * 4. Vraća strukturu koda
 */

import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { detectLanguage, SupportedLanguage } from './language-detector';
import { logger } from './logger';

export interface CodeStructure {
  functions: FunctionInfo[];
  classes: ClassInfo[];
  variables: VariableInfo[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  complexity: number;
}

export interface FunctionInfo {
  name: string;
  line: number;
  column: number;
  params: string[];
  isAsync: boolean;
  isArrow: boolean;
  complexity: number;
}

export interface ClassInfo {
  name: string;
  line: number;
  column: number;
  methods: string[];
  extends?: string;
}

export interface VariableInfo {
  name: string;
  line: number;
  column: number;
  type: 'const' | 'let' | 'var';
  isExported: boolean;
}

export interface ImportInfo {
  source: string;
  line: number;
  column: number;
  specifiers: string[];
}

export interface ExportInfo {
  name: string;
  line: number;
  column: number;
  type: 'default' | 'named' | 'all';
}

/**
 * Parsira kod u AST i ekstraktuje strukturu
 * 
 * @param code - Source code string
 * @param filename - Ime fajla (za detekciju jezika)
 * @returns CodeStructure sa ekstraktovanim informacijama
 */
export function parseCode(code: string, filename: string): CodeStructure {
  const language = detectLanguage(filename);
  
  // AST parsing je trenutno podržan samo za JavaScript/TypeScript
  // Za ostale jezike, vraćamo praznu strukturu (Security Service i dalje radi sa regex pattern-ima)
  if (!language.isSupported || (language.language !== 'javascript' && language.language !== 'typescript')) {
    logger.debug('AST parsing not available for this language, using pattern matching only', {
      filename,
      language: language.language,
    });
    return getEmptyStructure();
  }

  try {
    // Parse options za Babel (samo za JS/TS)
    const parseOptions: any = {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      plugins: getBabelPlugins(language.language),
      errorRecovery: true, // Ne pada na greškama, nastavlja parsing
    };

    const ast = parse(code, parseOptions);
    
    return extractStructure(ast);
  } catch (error) {
    logger.error('AST parsing failed', {
      filename,
      error: error instanceof Error ? error.message : String(error),
    });
    return getEmptyStructure();
  }
}

/**
 * Ekstraktuje strukturu iz AST-a
 */
function extractStructure(ast: t.File): CodeStructure {
  const structure: CodeStructure = {
    functions: [],
    classes: [],
    variables: [],
    imports: [],
    exports: [],
    complexity: 0,
  };

  let complexity = 0;

  traverse(ast, {
    // Funkcije
    FunctionDeclaration(path) {
      const node = path.node;
      const loc = node.loc;
      
      if (loc) {
        structure.functions.push({
          name: node.id?.name || 'anonymous',
          line: loc.start.line,
          column: loc.start.column,
          params: node.params.map((p) => {
            if (t.isIdentifier(p)) return p.name;
            if (t.isRestElement(p) && t.isIdentifier(p.argument)) return `...${p.argument.name}`;
            return 'unknown';
          }),
          isAsync: node.async,
          isArrow: false,
          complexity: calculateComplexity(path),
        });
        complexity += calculateComplexity(path);
      }
    },

    // Arrow funkcije
    ArrowFunctionExpression(path) {
      const node = path.node;
      const loc = node.loc;
      const parent = path.parent;
      
      if (loc && (t.isVariableDeclarator(parent) || t.isAssignmentExpression(parent))) {
        let name = 'anonymous';
        if (t.isVariableDeclarator(parent) && t.isIdentifier(parent.id)) {
          name = parent.id.name;
        }
        
        structure.functions.push({
          name,
          line: loc.start.line,
          column: loc.start.column,
          params: node.params.map((p) => {
            if (t.isIdentifier(p)) return p.name;
            if (t.isRestElement(p) && t.isIdentifier(p.argument)) return `...${p.argument.name}`;
            return 'unknown';
          }),
          isAsync: node.async,
          isArrow: true,
          complexity: calculateComplexity(path),
        });
        complexity += calculateComplexity(path);
      }
    },

    // Klase
    ClassDeclaration(path) {
      const node = path.node;
      const loc = node.loc;
      
      if (loc) {
        const methods: string[] = [];
        
        node.body.body.forEach((member) => {
          if (t.isClassMethod(member) || t.isClassPrivateMethod(member)) {
            if (t.isIdentifier(member.key)) {
              methods.push(member.key.name);
            } else if (t.isStringLiteral(member.key)) {
              methods.push(member.key.value);
            }
          }
        });
        
        structure.classes.push({
          name: node.id?.name || 'anonymous',
          line: loc.start.line,
          column: loc.start.column,
          methods,
          extends: node.superClass && t.isIdentifier(node.superClass) 
            ? node.superClass.name 
            : undefined,
        });
      }
    },

    // Varijable
    VariableDeclarator(path) {
      const node = path.node;
      const loc = node.loc;
      const parent = path.parent;
      
      if (loc && t.isIdentifier(node.id) && t.isVariableDeclaration(parent)) {
        const isExported = path.findParent((p) => 
          t.isExportNamedDeclaration(p.node) || t.isExportDefaultDeclaration(p.node)
        ) !== null;
        
        structure.variables.push({
          name: node.id.name,
          line: loc.start.line,
          column: loc.start.column,
          type: parent.kind as 'const' | 'let' | 'var',
          isExported,
        });
      }
    },

    // Importi
    ImportDeclaration(path) {
      const node = path.node;
      const loc = node.loc;
      
      if (loc) {
        const specifiers: string[] = node.specifiers.map((spec) => {
          if (t.isImportDefaultSpecifier(spec)) {
            return spec.local.name;
          }
          if (t.isImportSpecifier(spec)) {
            if (t.isIdentifier(spec.imported)) {
              return spec.imported.name;
            }
            if (t.isStringLiteral(spec.imported)) {
              return spec.imported.value;
            }
          }
          return 'unknown';
        });
        
        structure.imports.push({
          source: node.source.value,
          line: loc.start.line,
          column: loc.start.column,
          specifiers,
        });
      }
    },

    // Exporti
    ExportNamedDeclaration(path) {
      const node = path.node;
      const loc = node.loc;
      
      if (loc && node.declaration) {
        if (t.isFunctionDeclaration(node.declaration) && node.declaration.id) {
          structure.exports.push({
            name: node.declaration.id.name,
            line: loc.start.line,
            column: loc.start.column,
            type: 'named',
          });
        }
        if (t.isClassDeclaration(node.declaration) && node.declaration.id) {
          structure.exports.push({
            name: node.declaration.id.name,
            line: loc.start.line,
            column: loc.start.column,
            type: 'named',
          });
        }
      }
    },

    ExportDefaultDeclaration(path) {
      const node = path.node;
      const loc = node.loc;
      
      if (loc) {
        if (t.isFunctionDeclaration(node.declaration) && node.declaration.id) {
          structure.exports.push({
            name: node.declaration.id.name,
            line: loc.start.line,
            column: loc.start.column,
            type: 'default',
          });
        }
        if (t.isClassDeclaration(node.declaration) && node.declaration.id) {
          structure.exports.push({
            name: node.declaration.id.name,
            line: loc.start.line,
            column: loc.start.column,
            type: 'default',
          });
        }
      }
    },
  });

  structure.complexity = complexity;
  return structure;
}

/**
 * Izračunava kompleksnost funkcije (osnovna verzija)
 */
function calculateComplexity(path: any): number {
  let complexity = 1; // Base complexity
  
  path.traverse({
    IfStatement: () => complexity++,
    ForStatement: () => complexity++,
    ForInStatement: () => complexity++,
    ForOfStatement: () => complexity++,
    WhileStatement: () => complexity++,
    DoWhileStatement: () => complexity++,
    SwitchStatement: () => complexity++,
    ConditionalExpression: () => complexity++,
    LogicalExpression: () => complexity++,
    CatchClause: () => complexity++,
  });
  
  return complexity;
}

/**
 * Vraća Babel plugin-e za dati jezik
 */
function getBabelPlugins(_language: SupportedLanguage): string[] {
  const basePlugins = [
    'jsx',
    'typescript',
    'decorators-legacy',
    'classProperties',
    'objectRestSpread',
    'asyncGenerators',
    'functionBind',
    'exportDefaultFrom',
    'exportNamespaceFrom',
    'dynamicImport',
    'nullishCoalescingOperator',
    'optionalChaining',
  ];

  return basePlugins;
}

/**
 * Vraća praznu strukturu
 */
function getEmptyStructure(): CodeStructure {
  return {
    functions: [],
    classes: [],
    variables: [],
    imports: [],
    exports: [],
    complexity: 0,
  };
}
