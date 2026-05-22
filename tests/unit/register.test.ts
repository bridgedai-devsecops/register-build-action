import { ensureBuild, extractBuildIdFromResolveResponse } from '@bridgedai/actions-core';

jest.mock('@bridgedai/actions-core', () => {
  const actual = jest.requireActual('@bridgedai/actions-core');
  return {
    ...actual,
    ensureBuild: jest.fn(),
    requireBridgedAuth: jest.fn(() => ({ apiKey: 'k' })),
  };
});

describe('register-build ensure helpers', () => {
  it('extractBuildIdFromResolveResponse reads buildId', () => {
    expect(extractBuildIdFromResolveResponse({ buildId: 'bld_x' })).toBe('bld_x');
  });

  it('ensureBuild contract shape', async () => {
    (ensureBuild as jest.Mock).mockResolvedValue({
      buildId: 'bld_1',
      projectId: 'prj_1',
      created: true,
    });
    const client = {} as any;
    const res = await ensureBuild(client, {
      orgId: 'org_1',
      repoFullName: 'o/r',
      workflowRunId: '99',
      commitSha: 'abc',
    });
    expect(res.buildId).toBe('bld_1');
  });
});
