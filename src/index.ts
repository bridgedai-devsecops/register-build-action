import * as core from '@actions/core';
import {
  BridgedHttpClient,
  BridgedApiError,
  DEFAULT_BRIDGED_API_BASE,
  ensureBuild,
  extractBuildIdFromResolveResponse,
  firstNonEmpty,
  redactSecrets,
  resolveBridgedApiBase,
  requireBridgedAuth,
} from '@bridgedai/actions-core';
import { fail, getOptionalInput, maskSecret } from './lib/action-core';
import { ConfigurationError } from './lib/errors';

function workflowPathFromEnv(): string {
  const ref = String(process.env.GITHUB_WORKFLOW_REF ?? '').trim();
  if (!ref) return '';
  const parts = ref.split('@');
  return parts[0]?.replace(/^\.github\/workflows\//, '') ?? '';
}

export async function run(): Promise<void> {
  const apiBaseRaw = firstNonEmpty(
    getOptionalInput('api-url'),
    getOptionalInput('api-base'),
    String(process.env.BRIDGED_API_BASE ?? '').trim(),
    DEFAULT_BRIDGED_API_BASE,
  );
  const apiBase = resolveBridgedApiBase(apiBaseRaw, 'api-base', DEFAULT_BRIDGED_API_BASE);
  const orgId = firstNonEmpty(
    getOptionalInput('org-id'),
    getOptionalInput('organization-id'),
    String(process.env.BRIDGED_ORG_ID ?? '').trim(),
    String(process.env.BRIDGEDAI_ORG_ID ?? '').trim(),
  );
  if (!orgId) fail(new ConfigurationError('Missing required org-id input or BRIDGED_ORG_ID / BRIDGEDAI_ORG_ID env'));

  const cred = requireBridgedAuth({
    apiKey: firstNonEmpty(
      getOptionalInput('api-key'),
      getOptionalInput('bridgedai-token'),
      String(process.env.BRIDGEDAI_API_KEY ?? process.env.BRIDGED_API_KEY ?? '').trim(),
    ),
    accessToken: getOptionalInput('access-token'),
  });
  if (cred.apiKey) maskSecret(cred.apiKey);
  if (cred.accessToken) maskSecret(cred.accessToken);

  const repoFullName = firstNonEmpty(getOptionalInput('repo-full-name'), String(process.env.GITHUB_REPOSITORY ?? '').trim());
  const workflowRunId = firstNonEmpty(getOptionalInput('workflow-run-id'), String(process.env.GITHUB_RUN_ID ?? '').trim());
  const commitSha = firstNonEmpty(getOptionalInput('commit-sha'), String(process.env.GITHUB_SHA ?? '').trim());
  const branch = firstNonEmpty(getOptionalInput('branch'), String(process.env.GITHUB_REF_NAME ?? '').trim());
  const workflowName = firstNonEmpty(getOptionalInput('workflow-name'), String(process.env.GITHUB_WORKFLOW ?? '').trim());
  const workflowPath = getOptionalInput('workflow-path') || workflowPathFromEnv();
  const status = getOptionalInput('status') || 'in_progress';

  if (!repoFullName || !workflowRunId || !commitSha) {
    fail(
      new ConfigurationError(
        'register-build requires repo-full-name, workflow-run-id, and commit-sha (defaults: GITHUB_REPOSITORY, GITHUB_RUN_ID, GITHUB_SHA).',
      ),
    );
  }

  const timeoutMs = Number.parseInt(getOptionalInput('timeout-ms') || '60000', 10);
  const client = new BridgedHttpClient({
    baseUrl: apiBase,
    orgId,
    ...cred,
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 60_000,
  });

  const redactSecret = cred.accessToken ?? cred.apiKey ?? '';
  let res;
  try {
    res = await ensureBuild(client, {
      orgId,
      repoFullName,
      workflowRunId,
      commitSha,
      branch: branch || undefined,
      workflowName: workflowName || undefined,
      workflowPath: workflowPath || undefined,
      status,
    });
  } catch (e) {
    if (e instanceof BridgedApiError) {
      core.error(redactSecrets(e.message, redactSecret));
      if (e.status === 403) {
        core.error('Repo not bound to this org — bind via PUT /v1/organizations/:orgId/projects/:projectId/bindings/github.');
      }
    }
    throw e;
  }

  const buildId = extractBuildIdFromResolveResponse(res);
  if (!buildId) fail(new ConfigurationError('POST /v1/builds/ensure did not return a build id.'));

  core.setOutput('build-id', buildId);
  core.setOutput('project-id', String(res.projectId ?? ''));
  core.setOutput('created', String(Boolean(res.created)));
  core.info(`Ensured build id: ${buildId}${res.created ? ' (created)' : ''}`);
}
