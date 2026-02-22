#!/usr/bin/env node
/**
 * NeatCommit CLI – trigger analysis via API.
 * Usage:
 *   NEATCOMMIT_TOKEN=<jwt> node neatcommit.js analyze --owner <owner> --repo <repo> --pr <number>
 *   NEATCOMMIT_TOKEN=<jwt> node neatcommit.js analyze --url <apiUrl> --owner <owner> --repo <repo> --pr <number>
 * Exit code: 0 if queued (202), 1 on error or if quality gate would fail (use for CI).
 */

const args = process.argv.slice(2);
const token = process.env.NEATCOMMIT_TOKEN;
const apiUrl = process.env.NEATCOMMIT_API_URL || 'https://api.neatcommit.com';

function parseArgs() {
  const o = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--owner' && args[i + 1]) o.owner = args[++i];
    else if (args[i] === '--repo' && args[i + 1]) o.repo = args[++i];
    else if ((args[i] === '--pr' || args[i] === '--pullNumber') && args[i + 1]) o.pullNumber = parseInt(args[++i], 10);
    else if (args[i] === '--url' && args[i + 1]) o.apiUrl = args[++i];
    else if (args[i] === 'analyze') o.cmd = 'analyze';
  }
  return o;
}

async function run() {
  const { cmd, owner, repo, pullNumber, apiUrl: url } = parseArgs();
  const baseUrl = url || apiUrl;

  if (cmd !== 'analyze' || !owner || !repo || !pullNumber) {
    console.error('Usage: NEATCOMMIT_TOKEN=<jwt> neatcommit analyze --owner <owner> --repo <repo> --pr <number>');
    console.error('   or: NEATCOMMIT_API_URL=<url> NEATCOMMIT_TOKEN=<jwt> neatcommit analyze --owner <owner> --repo <repo> --pr <number>');
    process.exit(1);
  }

  if (!token) {
    console.error('NEATCOMMIT_TOKEN (JWT) is required');
    process.exit(1);
  }

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/analyze/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ owner, repo, pullNumber }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 202) {
      console.log('Analysis queued:', data.jobId || data.reviewId || 'ok');
      process.exit(0);
    }
    console.error('Trigger failed:', res.status, data.error || data.message || res.statusText);
    process.exit(1);
  } catch (e) {
    console.error('Request failed:', e.message);
    process.exit(1);
  }
}

run();
