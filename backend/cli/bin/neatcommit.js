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

const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

function parseArgs() {
  const o = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--owner' && args[i + 1]) o.owner = args[++i];
    else if (args[i] === '--repo' && args[i + 1]) o.repo = args[++i];
    else if ((args[i] === '--pr' || args[i] === '--pullNumber') && args[i + 1]) o.pullNumber = parseInt(args[++i], 10);
    else if (args[i] === '--url' && args[i + 1]) o.apiUrl = args[++i];
    else if (args[i] === 'analyze') o.cmd = 'analyze';
    else if (args[i] === '--wait') o.wait = true;
  }
  return o;
}

async function pollReviewStatus(baseUrl, reviewId, authToken) {
  const start = Date.now();
  const url = `${baseUrl.replace(/\/$/, '')}/api/reviews/${reviewId}`;
  const headers = { Authorization: `Bearer ${authToken}` };

  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const res = await fetch(url, { headers });
    if (res.status !== 200) {
      const data = await res.json().catch(() => ({}));
      console.error('Failed to fetch review:', res.status, data.error || res.statusText);
      return { status: 'error', qualityGatePassed: false };
    }
    const data = await res.json();
    const status = data.status;
    if (status === 'completed') {
      return { status: 'completed', qualityGatePassed: data.qualityGatePassed === true };
    }
    if (status === 'failed') {
      return { status: 'failed', qualityGatePassed: false };
    }
    process.stderr.write(`  Waiting for analysis... (${status})\n`);
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  console.error('Polling timed out');
  return { status: 'timeout', qualityGatePassed: false };
}

async function run() {
  const { cmd, owner, repo, pullNumber, apiUrl: url, wait } = parseArgs();
  const baseUrl = url || apiUrl;

  if (cmd !== 'analyze' || !owner || !repo || !pullNumber) {
    console.error('Usage: NEATCOMMIT_TOKEN=<jwt> neatcommit analyze --owner <owner> --repo <repo> --pr <number> [--wait]');
    console.error('   or: NEATCOMMIT_API_URL=<url> NEATCOMMIT_TOKEN=<jwt> neatcommit analyze --owner <owner> --repo <repo> --pr <number> [--wait]');
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
    if (res.status !== 202) {
      console.error('Trigger failed:', res.status, data.error || data.message || res.statusText);
      process.exit(1);
    }

    const reviewId = data.reviewId;
    console.log('Analysis queued:', data.jobId || reviewId || 'ok');

    if (!wait || !reviewId) {
      process.exit(0);
      return;
    }

    const result = await pollReviewStatus(baseUrl, reviewId, token);
    if (result.status === 'completed' && result.qualityGatePassed) {
      console.log('Analysis completed. Quality gate: Passed');
      process.exit(0);
      return;
    }
    if (result.status === 'completed' && !result.qualityGatePassed) {
      console.error('Analysis completed. Quality gate: Failed');
      process.exit(1);
      return;
    }
    if (result.status === 'failed') {
      console.error('Analysis failed.');
      process.exit(1);
      return;
    }
    if (result.status === 'timeout' || result.status === 'error') {
      process.exit(1);
    }
  } catch (e) {
    console.error('Request failed:', e.message);
    process.exit(1);
  }
}

run();
