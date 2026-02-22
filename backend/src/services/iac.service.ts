/**
 * IaC (Infrastructure as Code) analyzer – Terraform, Dockerfile, K8s.
 * Detects hardcoded secrets, unsafe defaults, missing limits.
 */

export interface IacIssue {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category: 'SECURITY' | 'QUALITY';
  title: string;
  description: string;
  line?: number;
  suggestedFix?: string;
}

function issue(
  severity: IacIssue['severity'],
  title: string,
  description: string,
  line: number,
  suggestedFix: string
): IacIssue {
  return {
    severity,
    category: 'SECURITY',
    title,
    description,
    line,
    suggestedFix,
  };
}

/**
 * Analyze Terraform (.tf) for hardcoded secrets and unsafe patterns.
 */
export function analyzeTerraform(code: string, _filename: string): IacIssue[] {
  const issues: IacIssue[] = [];
  const lines = code.split(/\r?\n/);
  lines.forEach((line, i) => {
    const lineNum = i + 1;
    if (/password\s*=\s*["'][^"']+["']/i.test(line) || /secret\s*=\s*["'][^"']+["']/i.test(line)) {
      issues.push(
        issue(
          'CRITICAL',
          'Hardcoded secret in Terraform',
          'Sensitive value should not be in source; use variable or vault',
          lineNum,
          'Use var.secret_name or a secrets backend (e.g. Vault, AWS Secrets Manager)'
        )
      );
    }
    if (/allow_public_access\s*=\s*true/i.test(line)) {
      issues.push(
        issue(
          'HIGH',
          'Public access enabled',
          'Resource may be exposed to the internet',
          lineNum,
          'Set to false or restrict with CIDR/list'
        )
      );
    }
  });
  return issues;
}

/**
 * Analyze Dockerfile for root, exposed ports, unsafe RUN.
 */
export function analyzeDockerfile(code: string, _filename: string): IacIssue[] {
  const issues: IacIssue[] = [];
  const lines = code.split(/\r?\n/);
  let hasUser = false;
  lines.forEach((line, i) => {
    const lineNum = i + 1;
    if (/^USER\s+/i.test(line)) hasUser = true;
    if (/^EXPOSE\s+\d+/i.test(line) && line.match(/EXPOSE\s+(\d+)/)?.[1] === '22') {
      issues.push(
        issue('MEDIUM', 'SSH port exposed', 'Exposing 22 can be a risk; prefer exec', lineNum, 'Avoid EXPOSE 22; use docker exec instead')
      );
    }
    if (/RUN\s+.*\bcurl\s+.*\|\s*sh\b/i.test(line)) {
      issues.push(
        issue('HIGH', 'Unsafe RUN with pipe to shell', 'Piping download to sh is unsafe', lineNum, 'Download to file, verify, then run')
      );
    }
  });
  if (!hasUser && lines.some((l) => /^RUN\s/i.test(l))) {
    issues.push(
      issue(
        'MEDIUM',
        'Container may run as root',
        'No USER directive; default is root',
        1,
        'Add USER nonroot (or similar) after installing dependencies'
      )
    );
  }
  return issues;
}

/**
 * Analyze Kubernetes YAML for default namespace, missing limits.
 */
export function analyzeK8sYaml(code: string, filename: string): IacIssue[] {
  const issues: IacIssue[] = [];
  const lines = code.split(/\r?\n/);
  const isManifest = /\.(yaml|yml)$/i.test(filename) && (code.includes('apiVersion:') && code.includes('kind:'));
  if (!isManifest) return issues;
  const hasNamespace = /namespace:\s*default\b/im.test(code) || /namespace:\s*["']?default["']?/im.test(code);
  if (hasNamespace) {
    const idx = lines.findIndex((l) => /namespace:\s*(default|["']default["'])/im.test(l));
    issues.push(
      issue(
        'LOW',
        'Using default namespace',
        'Prefer a dedicated namespace for clarity and RBAC',
        idx >= 0 ? idx + 1 : 1,
        'Set namespace to a dedicated value (e.g. app-name)'
      )
    );
  }
  if (/kind:\s*(Deployment|StatefulSet)/im.test(code) && !/resources:\s*[\s\S]*?limits:/m.test(code)) {
    const idx = lines.findIndex((l) => /kind:\s*(Deployment|StatefulSet)/i.test(l));
    issues.push(
      issue(
        'MEDIUM',
        'Missing resource limits',
        'Containers should have limits to avoid resource exhaustion',
        idx >= 0 ? idx + 1 : 1,
        'Add resources.limits (memory, cpu) to container spec'
      )
    );
  }
  return issues;
}

/**
 * Run IaC analysis if filename matches; returns empty array otherwise.
 */
export function analyzeIacFile(code: string, filename: string): IacIssue[] {
  const name = filename.split('/').pop() ?? filename;
  if (filename.endsWith('.tf')) return analyzeTerraform(code, filename);
  if (name === 'Dockerfile' || name?.startsWith('Dockerfile.')) return analyzeDockerfile(code, filename);
  if (/\.(yaml|yml)$/i.test(filename) && (filename.includes('k8s') || filename.includes('manifests') || filename.includes('kubernetes'))) {
    return analyzeK8sYaml(code, filename);
  }
  return [];
}
