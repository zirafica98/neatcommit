/**
 * Security Patterns - Jezik-specifični security pattern-i
 * 
 * Ova datoteka sadrži security pattern-e organizovane po jezicima.
 * Svaki jezik ima svoje specifične pattern-e za detekciju security problema.
 */

import { SupportedLanguage } from '../utils/language-detector';

export interface SecurityPattern {
  pattern: RegExp;
  name: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'SECURITY' | 'PERFORMANCE' | 'QUALITY' | 'BEST_PRACTICE';
  description: string;
  suggestedFix: string;
  cweId?: string;
  owaspCategory?: string;
  /** Rule id for config disable/severityOverrides (e.g. "hardcoded-password") */
  id?: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function getPatternId(p: SecurityPattern): string {
  return p.id ?? slugify(p.name);
}

/**
 * Univerzalni pattern-i (rade za sve jezike)
 */
const universalPatterns: SecurityPattern[] = [
  // Hardcoded secrets
  {
    id: 'hardcoded-password',
    pattern: /password\s*[:=]\s*['"](.+?)['"]/gi,
    name: 'Hardcoded Password',
    severity: 'CRITICAL',
    category: 'SECURITY',
    description: 'Password is hardcoded in source code',
    suggestedFix: 'Move password to environment variable or secure vault',
    cweId: 'CWE-798',
    owaspCategory: 'A07:2021 – Identification and Authentication Failures',
  },
  {
    id: 'hardcoded-api-key',
    pattern: /api[_-]?key\s*[:=]\s*['"](.+?)['"]/gi,
    name: 'Hardcoded API Key',
    severity: 'CRITICAL',
    category: 'SECURITY',
    description: 'API key is hardcoded in source code',
    suggestedFix: 'Move API key to environment variable or secure vault',
    cweId: 'CWE-798',
    owaspCategory: 'A07:2021 – Identification and Authentication Failures',
  },
  {
    id: 'hardcoded-secret',
    pattern: /secret\s*[:=]\s*['"](.+?)['"]/gi,
    name: 'Hardcoded Secret',
    severity: 'CRITICAL',
    category: 'SECURITY',
    description: 'Secret is hardcoded in source code',
    suggestedFix: 'Move secret to environment variable or secure vault',
    cweId: 'CWE-798',
    owaspCategory: 'A07:2021 – Identification and Authentication Failures',
  },
  {
    id: 'hardcoded-token',
    pattern: /token\s*[:=]\s*['"](.+?)['"]/gi,
    name: 'Hardcoded Token',
    severity: 'CRITICAL',
    category: 'SECURITY',
    description: 'Token is hardcoded in source code',
    suggestedFix: 'Move token to environment variable or secure vault',
    cweId: 'CWE-798',
    owaspCategory: 'A07:2021 – Identification and Authentication Failures',
  },
  // Insecure HTTP
  {
    id: 'insecure-http',
    pattern: /http:\/\/(?!localhost|127\.0\.0\.1)/gi,
    name: 'Insecure HTTP Connection',
    severity: 'MEDIUM',
    category: 'SECURITY',
    description: 'HTTP connection is not encrypted',
    suggestedFix: 'Use HTTPS instead of HTTP',
    cweId: 'CWE-319',
    owaspCategory: 'A02:2021 – Cryptographic Failures',
  },
  // Weak crypto
  {
    pattern: /\bmd5\s*\(/gi,
    name: 'Weak Hash Algorithm (MD5)',
    severity: 'HIGH',
    category: 'SECURITY',
    description: 'MD5 is cryptographically broken',
    suggestedFix: 'Use SHA-256 or stronger algorithms',
    cweId: 'CWE-327',
    owaspCategory: 'A02:2021 – Cryptographic Failures',
  },
  {
    id: 'weak-hash-sha1',
    pattern: /\bsha1\s*\(/gi,
    name: 'Weak Hash Algorithm (SHA1)',
    severity: 'HIGH',
    category: 'SECURITY',
    description: 'SHA1 is cryptographically broken',
    suggestedFix: 'Use SHA-256 or stronger algorithms',
    cweId: 'CWE-327',
    owaspCategory: 'A02:2021 – Cryptographic Failures',
  },
  // Secret scanning – known formats
  {
    id: 'secret-aws-key',
    pattern: /\b(AKIA[A-Z0-9]{16})\b/g,
    name: 'Possible AWS Access Key',
    severity: 'CRITICAL',
    category: 'SECURITY',
    description: 'String matches AWS access key format. Do not commit real keys.',
    suggestedFix: 'Use environment variables or a secrets manager',
    cweId: 'CWE-798',
    owaspCategory: 'A07:2021 – Identification and Authentication Failures',
  },
  {
    id: 'secret-github-token',
    pattern: /\b(ghp_[a-zA-Z0-9]{36,})\b/g,
    name: 'Possible GitHub Personal Access Token',
    severity: 'CRITICAL',
    category: 'SECURITY',
    description: 'String matches GitHub token format. Do not commit tokens.',
    suggestedFix: 'Use GitHub Actions secrets or environment variables',
    cweId: 'CWE-798',
    owaspCategory: 'A07:2021 – Identification and Authentication Failures',
  },
  {
    id: 'secret-jwt',
    pattern: /\beyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/g,
    name: 'Possible JWT in source',
    severity: 'HIGH',
    category: 'SECURITY',
    description: 'JWT-like string in code. Tokens should not be hardcoded.',
    suggestedFix: 'Issue and validate JWTs at runtime; do not store in code',
    cweId: 'CWE-798',
    owaspCategory: 'A07:2021 – Identification and Authentication Failures',
  },
];

/**
 * JavaScript/TypeScript specifični pattern-i
 */
const javascriptPatterns: SecurityPattern[] = [
  // SQL Injection
  {
    pattern: /query\s*\(\s*['"`](.*?\$\{.*?\}.*?)['"`]/gi,
    name: 'Potential SQL Injection',
    severity: 'HIGH',
    category: 'SECURITY',
    description: 'SQL query contains user input without parameterization',
    suggestedFix: 'Use parameterized queries or prepared statements',
    cweId: 'CWE-89',
    owaspCategory: 'A03:2021 – Injection',
  },
  // XSS
  {
    pattern: /innerHTML\s*=\s*.*\$\{/gi,
    name: 'Potential XSS - innerHTML',
    severity: 'HIGH',
    category: 'SECURITY',
    description: 'innerHTML is set with user input without sanitization',
    suggestedFix: 'Sanitize user input or use textContent',
    cweId: 'CWE-79',
    owaspCategory: 'A03:2021 – Injection',
  },
  {
    pattern: /dangerouslySetInnerHTML/gi,
    name: 'Potential XSS - dangerouslySetInnerHTML',
    severity: 'HIGH',
    category: 'SECURITY',
    description: 'dangerouslySetInnerHTML can lead to XSS attacks',
    suggestedFix: 'Sanitize content or use safe alternatives',
    cweId: 'CWE-79',
    owaspCategory: 'A03:2021 – Injection',
  },
  // Insecure random
  {
    pattern: /Math\.random\(\)/g,
    name: 'Insecure Random Number Generation',
    severity: 'MEDIUM',
    category: 'SECURITY',
    description: 'Math.random() is not cryptographically secure',
    suggestedFix: 'Use crypto.getRandomValues() or crypto.randomBytes()',
    cweId: 'CWE-330',
    owaspCategory: 'A02:2021 – Cryptographic Failures',
  },
  // Eval
  {
    pattern: /\beval\s*\(/gi,
    name: 'Use of eval()',
    severity: 'CRITICAL',
    category: 'SECURITY',
    description: 'eval() can execute arbitrary code',
    suggestedFix: 'Use JSON.parse() or other safe alternatives',
    cweId: 'CWE-95',
    owaspCategory: 'A03:2021 – Injection',
  },
];

/**
 * Java specifični pattern-i
 */
const javaPatterns: SecurityPattern[] = [
  // SQL Injection
  {
    pattern: /Statement\s*\.\s*executeQuery\s*\(\s*["'](.*?\+.*?)["']/gi,
    name: 'Potential SQL Injection - String Concatenation',
    severity: 'CRITICAL',
    category: 'SECURITY',
    description: 'SQL query uses string concatenation instead of PreparedStatement',
    suggestedFix: 'Use PreparedStatement with parameterized queries',
    cweId: 'CWE-89',
    owaspCategory: 'A03:2021 – Injection',
  },
  {
    pattern: /Statement\s*\.\s*execute\s*\(\s*["'](.*?\+.*?)["']/gi,
    name: 'Potential SQL Injection - execute()',
    severity: 'CRITICAL',
    category: 'SECURITY',
    description: 'SQL execute() uses string concatenation',
    suggestedFix: 'Use PreparedStatement with parameterized queries',
    cweId: 'CWE-89',
    owaspCategory: 'A03:2021 – Injection',
  },
  // XSS
  {
    pattern: /response\.getWriter\(\)\.print\s*\(\s*.*request\./gi,
    name: 'Potential XSS - Direct Output',
    severity: 'HIGH',
    category: 'SECURITY',
    description: 'User input is directly written to response without encoding',
    suggestedFix: 'Use ESAPI.encoder().encodeForHTML() or similar',
    cweId: 'CWE-79',
    owaspCategory: 'A03:2021 – Injection',
  },
  // Deserialization
  {
    pattern: /ObjectInputStream|readObject\s*\(/gi,
    name: 'Unsafe Deserialization',
    severity: 'CRITICAL',
    category: 'SECURITY',
    description: 'Deserialization can lead to remote code execution',
    suggestedFix: 'Avoid deserialization or use safe alternatives (JSON, XML)',
    cweId: 'CWE-502',
    owaspCategory: 'A08:2021 – Software and Data Integrity Failures',
  },
  // Insecure random
  {
    pattern: /new\s+Random\s*\(/gi,
    name: 'Insecure Random Number Generation',
    severity: 'MEDIUM',
    category: 'SECURITY',
    description: 'java.util.Random is not cryptographically secure',
    suggestedFix: 'Use java.security.SecureRandom instead',
    cweId: 'CWE-330',
    owaspCategory: 'A02:2021 – Cryptographic Failures',
  },
];

/**
 * Python specifični pattern-i
 */
const pythonPatterns: SecurityPattern[] = [
  // SQL Injection
  {
    pattern: /execute\s*\(\s*["'](.*?%s.*?)["']/gi,
    name: 'Potential SQL Injection - String Formatting',
    severity: 'CRITICAL',
    category: 'SECURITY',
    description: 'SQL query uses string formatting instead of parameterized queries',
    suggestedFix: 'Use parameterized queries with ? or %s placeholders',
    cweId: 'CWE-89',
    owaspCategory: 'A03:2021 – Injection',
  },
  {
    pattern: /\.format\s*\(.*\)\s*\)\s*\)/gi,
    name: 'Potential SQL Injection - format()',
    severity: 'CRITICAL',
    category: 'SECURITY',
    description: 'SQL query uses .format() which can lead to injection',
    suggestedFix: 'Use parameterized queries',
    cweId: 'CWE-89',
    owaspCategory: 'A03:2021 – Injection',
  },
  // Command Injection
  {
    pattern: /os\.system\s*\(/gi,
    name: 'Command Injection - os.system()',
    severity: 'CRITICAL',
    category: 'SECURITY',
    description: 'os.system() can execute arbitrary commands',
    suggestedFix: 'Use subprocess with proper argument handling',
    cweId: 'CWE-78',
    owaspCategory: 'A03:2021 – Injection',
  },
  {
    pattern: /subprocess\.call\s*\(\s*\[.*\$\{/gi,
    name: 'Command Injection - subprocess',
    severity: 'HIGH',
    category: 'SECURITY',
    description: 'subprocess with shell=True can be dangerous',
    suggestedFix: 'Use subprocess without shell=True and proper argument list',
    cweId: 'CWE-78',
    owaspCategory: 'A03:2021 – Injection',
  },
  // Pickle deserialization
  {
    pattern: /pickle\.loads?\s*\(/gi,
    name: 'Unsafe Deserialization - Pickle',
    severity: 'CRITICAL',
    category: 'SECURITY',
    description: 'pickle can execute arbitrary code during deserialization',
    suggestedFix: 'Use JSON or other safe serialization formats',
    cweId: 'CWE-502',
    owaspCategory: 'A08:2021 – Software and Data Integrity Failures',
  },
  // Insecure random
  {
    pattern: /random\.(random|randint|choice)\s*\(/gi,
    name: 'Insecure Random Number Generation',
    severity: 'MEDIUM',
    category: 'SECURITY',
    description: 'random module is not cryptographically secure',
    suggestedFix: 'Use secrets module for cryptographically secure random',
    cweId: 'CWE-330',
    owaspCategory: 'A02:2021 – Cryptographic Failures',
  },
  // Eval
  {
    pattern: /\beval\s*\(/gi,
    name: 'Use of eval()',
    severity: 'CRITICAL',
    category: 'SECURITY',
    description: 'eval() can execute arbitrary code',
    suggestedFix: 'Use ast.literal_eval() or other safe alternatives',
    cweId: 'CWE-95',
    owaspCategory: 'A03:2021 – Injection',
  },
];

/**
 * PHP specifični pattern-i
 */
const phpPatterns: SecurityPattern[] = [
  // SQL Injection
  {
    pattern: /mysql_query\s*\(\s*["'](.*?\$.*?)["']/gi,
    name: 'Potential SQL Injection - mysql_query()',
    severity: 'CRITICAL',
    category: 'SECURITY',
    description: 'mysql_query() with string concatenation is vulnerable',
    suggestedFix: 'Use PDO or mysqli with prepared statements',
    cweId: 'CWE-89',
    owaspCategory: 'A03:2021 – Injection',
  },
  {
    pattern: /mysqli_query\s*\(\s*[^,]+,\s*["'](.*?\$.*?)["']/gi,
    name: 'Potential SQL Injection - mysqli_query()',
    severity: 'CRITICAL',
    category: 'SECURITY',
    description: 'mysqli_query() with string concatenation is vulnerable',
    suggestedFix: 'Use prepared statements with mysqli_prepare()',
    cweId: 'CWE-89',
    owaspCategory: 'A03:2021 – Injection',
  },
  // XSS
  {
    pattern: /echo\s+\$_(GET|POST|REQUEST)\[/gi,
    name: 'Potential XSS - Direct Output',
    severity: 'HIGH',
    category: 'SECURITY',
    description: 'User input is directly output without escaping',
    suggestedFix: 'Use htmlspecialchars() or htmlentities()',
    cweId: 'CWE-79',
    owaspCategory: 'A03:2021 – Injection',
  },
  {
    pattern: /print\s+\$_(GET|POST|REQUEST)\[/gi,
    name: 'Potential XSS - print()',
    severity: 'HIGH',
    category: 'SECURITY',
    description: 'User input is directly printed without escaping',
    suggestedFix: 'Use htmlspecialchars() or htmlentities()',
    cweId: 'CWE-79',
    owaspCategory: 'A03:2021 – Injection',
  },
  // File Inclusion
  {
    pattern: /include\s*\(\s*\$_(GET|POST|REQUEST)\[/gi,
    name: 'File Inclusion Vulnerability',
    severity: 'CRITICAL',
    category: 'SECURITY',
    description: 'File inclusion with user input can lead to remote code execution',
    suggestedFix: 'Validate and sanitize file paths, use whitelist',
    cweId: 'CWE-98',
    owaspCategory: 'A03:2021 – Injection',
  },
  {
    pattern: /require\s*\(\s*\$_(GET|POST|REQUEST)\[/gi,
    name: 'File Inclusion Vulnerability - require()',
    severity: 'CRITICAL',
    category: 'SECURITY',
    description: 'require() with user input can lead to remote code execution',
    suggestedFix: 'Validate and sanitize file paths, use whitelist',
    cweId: 'CWE-98',
    owaspCategory: 'A03:2021 – Injection',
  },
  // Eval
  {
    pattern: /\beval\s*\(/gi,
    name: 'Use of eval()',
    severity: 'CRITICAL',
    category: 'SECURITY',
    description: 'eval() can execute arbitrary code',
    suggestedFix: 'Avoid eval(), use safe alternatives',
    cweId: 'CWE-95',
    owaspCategory: 'A03:2021 – Injection',
  },
];

/**
 * C# specifični pattern-i
 */
const csharpPatterns: SecurityPattern[] = [
  // SQL Injection
  {
    pattern: /SqlCommand\s*\(\s*["'](.*?\+.*?)["']/gi,
    name: 'Potential SQL Injection - String Concatenation',
    severity: 'CRITICAL',
    category: 'SECURITY',
    description: 'SQL query uses string concatenation instead of parameters',
    suggestedFix: 'Use SqlParameter or parameterized queries',
    cweId: 'CWE-89',
    owaspCategory: 'A03:2021 – Injection',
  },
  {
    pattern: /String\.Format\s*\(\s*["'](.*?\{.*?\}.*?)["']/gi,
    name: 'Potential SQL Injection - String.Format()',
    severity: 'CRITICAL',
    category: 'SECURITY',
    description: 'SQL query uses String.Format() which can lead to injection',
    suggestedFix: 'Use SqlParameter or parameterized queries',
    cweId: 'CWE-89',
    owaspCategory: 'A03:2021 – Injection',
  },
  // XSS
  {
    pattern: /Response\.Write\s*\(\s*.*Request\./gi,
    name: 'Potential XSS - Response.Write()',
    severity: 'HIGH',
    category: 'SECURITY',
    description: 'User input is directly written to response without encoding',
    suggestedFix: 'Use HttpUtility.HtmlEncode() or Razor encoding',
    cweId: 'CWE-79',
    owaspCategory: 'A03:2021 – Injection',
  },
  // Deserialization
  {
    pattern: /BinaryFormatter\.(Deserialize|Serialize)\s*\(/gi,
    name: 'Unsafe Deserialization - BinaryFormatter',
    severity: 'CRITICAL',
    category: 'SECURITY',
    description: 'BinaryFormatter can lead to remote code execution',
    suggestedFix: 'Use JsonSerializer or other safe serialization',
    cweId: 'CWE-502',
    owaspCategory: 'A08:2021 – Software and Data Integrity Failures',
  },
  // Insecure random
  {
    pattern: /new\s+Random\s*\(/gi,
    name: 'Insecure Random Number Generation',
    severity: 'MEDIUM',
    category: 'SECURITY',
    description: 'System.Random is not cryptographically secure',
    suggestedFix: 'Use System.Security.Cryptography.RandomNumberGenerator',
    cweId: 'CWE-330',
    owaspCategory: 'A02:2021 – Cryptographic Failures',
  },
];

/**
 * SQL specifični pattern-i
 */
const sqlPatterns: SecurityPattern[] = [
  // SQL Injection patterns
  {
    pattern: /WHERE\s+.*\s*=\s*['"]\s*\+/gi,
    name: 'Potential SQL Injection - String Concatenation',
    severity: 'CRITICAL',
    category: 'SECURITY',
    description: 'SQL query uses string concatenation in WHERE clause',
    suggestedFix: 'Use parameterized queries or stored procedures',
    cweId: 'CWE-89',
    owaspCategory: 'A03:2021 – Injection',
  },
  {
    pattern: /EXEC\s+\(.*\+/gi,
    name: 'Potential SQL Injection - EXEC()',
    severity: 'CRITICAL',
    category: 'SECURITY',
    description: 'EXEC() with string concatenation is vulnerable',
    suggestedFix: 'Use parameterized queries or stored procedures',
    cweId: 'CWE-89',
    owaspCategory: 'A03:2021 – Injection',
  },
  // Missing WHERE clause
  {
    pattern: /UPDATE\s+\w+\s+SET\s+(?!WHERE)/gi,
    name: 'Missing WHERE Clause in UPDATE',
    severity: 'CRITICAL',
    category: 'SECURITY',
    description: 'UPDATE statement without WHERE clause updates all rows',
    suggestedFix: 'Always include WHERE clause in UPDATE statements',
    cweId: 'CWE-89',
    owaspCategory: 'A03:2021 – Injection',
  },
  {
    pattern: /DELETE\s+FROM\s+\w+\s+(?!WHERE)/gi,
    name: 'Missing WHERE Clause in DELETE',
    severity: 'CRITICAL',
    category: 'SECURITY',
    description: 'DELETE statement without WHERE clause deletes all rows',
    suggestedFix: 'Always include WHERE clause in DELETE statements',
    cweId: 'CWE-89',
    owaspCategory: 'A03:2021 – Injection',
  },
  // Privilege escalation
  {
    pattern: /GRANT\s+ALL\s+PRIVILEGES/gi,
    name: 'Excessive Privileges',
    severity: 'HIGH',
    category: 'SECURITY',
    description: 'GRANT ALL PRIVILEGES gives excessive permissions',
    suggestedFix: 'Grant only necessary privileges (principle of least privilege)',
    cweId: 'CWE-250',
    owaspCategory: 'A01:2021 – Broken Access Control',
  },
];

/**
 * Go specifični pattern-i
 */
const goPatterns: SecurityPattern[] = [
  // SQL Injection
  {
    pattern: /db\.Query\s*\(\s*["'](.*?\+.*?)["']/gi,
    name: 'Potential SQL Injection - String Concatenation',
    severity: 'CRITICAL',
    category: 'SECURITY',
    description: 'SQL query uses string concatenation instead of parameters',
    suggestedFix: 'Use parameterized queries with ? placeholders',
    cweId: 'CWE-89',
    owaspCategory: 'A03:2021 – Injection',
  },
  {
    pattern: /fmt\.Sprintf\s*\(\s*["'](.*?%s.*?)["']/gi,
    name: 'Potential SQL Injection - fmt.Sprintf()',
    severity: 'CRITICAL',
    category: 'SECURITY',
    description: 'SQL query uses fmt.Sprintf() which can lead to injection',
    suggestedFix: 'Use parameterized queries',
    cweId: 'CWE-89',
    owaspCategory: 'A03:2021 – Injection',
  },
  // Command Injection
  {
    pattern: /exec\.Command\s*\(\s*.*\+/gi,
    name: 'Command Injection - exec.Command()',
    severity: 'HIGH',
    category: 'SECURITY',
    description: 'exec.Command() with string concatenation can be dangerous',
    suggestedFix: 'Use exec.Command() with separate arguments, not string concatenation',
    cweId: 'CWE-78',
    owaspCategory: 'A03:2021 – Injection',
  },
  // Unsafe pointer
  {
    pattern: /unsafe\.Pointer/gi,
    name: 'Use of unsafe.Pointer',
    severity: 'MEDIUM',
    category: 'SECURITY',
    description: 'unsafe.Pointer bypasses type safety',
    suggestedFix: 'Avoid unsafe.Pointer unless absolutely necessary',
    cweId: 'CWE-20',
    owaspCategory: 'A03:2021 – Injection',
  },
];

/**
 * Ruby specifični pattern-i
 */
const rubyPatterns: SecurityPattern[] = [
  // SQL Injection
  {
    pattern: /\.where\s*\(\s*["'](.*?#\{.*?\}.*?)["']/gi,
    name: 'Potential SQL Injection - String Interpolation',
    severity: 'CRITICAL',
    category: 'SECURITY',
    description: 'SQL query uses string interpolation instead of parameters',
    suggestedFix: 'Use parameterized queries with ? placeholders',
    cweId: 'CWE-89',
    owaspCategory: 'A03:2021 – Injection',
  },
  {
    pattern: /execute\s*\(\s*["'](.*?#\{.*?\}.*?)["']/gi,
    name: 'Potential SQL Injection - execute()',
    severity: 'CRITICAL',
    category: 'SECURITY',
    description: 'SQL execute() uses string interpolation',
    suggestedFix: 'Use parameterized queries',
    cweId: 'CWE-89',
    owaspCategory: 'A03:2021 – Injection',
  },
  // XSS
  {
    pattern: /<%=.*@.*%>/gi,
    name: 'Potential XSS - ERB Template',
    severity: 'HIGH',
    category: 'SECURITY',
    description: 'ERB template outputs user input without escaping',
    suggestedFix: 'Use <%=h %> or html_escape()',
    cweId: 'CWE-79',
    owaspCategory: 'A03:2021 – Injection',
  },
  // Command Injection
  {
    pattern: /system\s*\(\s*["'](.*?#\{.*?\}.*?)["']/gi,
    name: 'Command Injection - system()',
    severity: 'CRITICAL',
    category: 'SECURITY',
    description: 'system() with string interpolation can execute arbitrary commands',
    suggestedFix: 'Use system() with separate arguments or Kernel.exec with array',
    cweId: 'CWE-78',
    owaspCategory: 'A03:2021 – Injection',
  },
  {
    pattern: /`\s*.*#\{.*?\}.*\s*`/gi,
    name: 'Command Injection - Backticks',
    severity: 'CRITICAL',
    category: 'SECURITY',
    description: 'Backticks with string interpolation can execute arbitrary commands',
    suggestedFix: 'Use system() or Kernel.exec with proper argument handling',
    cweId: 'CWE-78',
    owaspCategory: 'A03:2021 – Injection',
  },
  // Eval
  {
    pattern: /\beval\s*\(/gi,
    name: 'Use of eval()',
    severity: 'CRITICAL',
    category: 'SECURITY',
    description: 'eval() can execute arbitrary code',
    suggestedFix: 'Avoid eval(), use safe alternatives',
    cweId: 'CWE-95',
    owaspCategory: 'A03:2021 – Injection',
  },
];

/**
 * Dobija security pattern-e za dati jezik
 */
export function getSecurityPatterns(language: SupportedLanguage): SecurityPattern[] {
  const patterns: SecurityPattern[] = [...universalPatterns];

  switch (language) {
    case 'javascript':
    case 'typescript':
      patterns.push(...javascriptPatterns);
      break;
    case 'java':
      patterns.push(...javaPatterns);
      break;
    case 'python':
      patterns.push(...pythonPatterns);
      break;
    case 'php':
      patterns.push(...phpPatterns);
      break;
    case 'csharp':
      patterns.push(...csharpPatterns);
      break;
    case 'sql':
      patterns.push(...sqlPatterns);
      break;
    case 'go':
      patterns.push(...goPatterns);
      break;
    case 'ruby':
      patterns.push(...rubyPatterns);
      break;
    default:
      // Za nepoznate jezike, koristi samo univerzalne pattern-e
      break;
  }

  return patterns;
}

/**
 * Dobija broj pattern-a po jeziku
 */
export function getPatternCount(language: SupportedLanguage): number {
  return getSecurityPatterns(language).length;
}
