const { runAction, getWorkflowRunUrl } = require('./index');

function makeCore(inputs = {}) {
    return {
        getInput: jest.fn((name) => (name in inputs ? inputs[name] : '')),
        setFailed: jest.fn(),
    };
}

function makeExec() {
    return { exec: jest.fn().mockResolvedValue(0) };
}

function makeGithub({
    repo = 'my-repo',
    ref = 'refs/heads/main',
    sha = 'abc123',
    runNumber = 42,
    runId = 999,
    workflow = 'CI',
    eventName = 'push',
} = {}) {
    return {
        context: {
            repo: { owner: 'my-org', repo },
            ref,
            sha,
            runNumber,
            runId,
            workflow,
            eventName,
        },
    };
}

beforeEach(() => {
    process.env.GITHUB_SERVER_URL = 'https://github.com';
    process.env.GITHUB_REPOSITORY = 'my-org/my-repo';
    process.env.GITHUB_RUN_ID = '999';
});

describe('getWorkflowRunUrl', () => {
    test('builds URL from GITHUB_* env vars', () => {
        expect(getWorkflowRunUrl()).toBe('https://github.com/my-org/my-repo/actions/runs/999');
    });
});

describe('runAction — input handling', () => {
    test('uses project input when provided', async () => {
        const core = makeCore({ project: 'override-project', executable: 'ontrack-cli' });
        const execDep = makeExec();
        const github = makeGithub();
        await runAction({ core, exec: execDep, github });
        expect(execDep.exec).toHaveBeenCalledWith(
            'ontrack-cli',
            expect.arrayContaining(['--project', 'override-project']),
        );
    });

    test('falls back to github.context.repo.repo when project input is empty', async () => {
        const core = makeCore({ executable: 'ontrack-cli' });
        const execDep = makeExec();
        const github = makeGithub({ repo: 'fallback-repo' });
        await runAction({ core, exec: execDep, github });
        expect(execDep.exec).toHaveBeenCalledWith(
            'ontrack-cli',
            expect.arrayContaining(['--project', 'fallback-repo']),
        );
    });

    test('parses branch from github.context.ref', async () => {
        const core = makeCore({ executable: 'ontrack-cli' });
        const execDep = makeExec();
        const github = makeGithub({ ref: 'refs/heads/feature/foo' });
        await runAction({ core, exec: execDep, github });
        expect(execDep.exec).toHaveBeenCalledWith(
            'ontrack-cli',
            expect.arrayContaining(['--branch', 'feature/foo']),
        );
    });

    test('throws when ref is not refs/heads/* and branch input is empty', async () => {
        const core = makeCore({ executable: 'ontrack-cli' });
        const execDep = makeExec();
        const github = makeGithub({ ref: 'refs/tags/v1.0.0' });
        await expect(runAction({ core, exec: execDep, github })).rejects.toThrow('Ref not supported: refs/tags/v1.0.0');
    });

    test('uses github.context.runNumber when build input is empty', async () => {
        const core = makeCore({ executable: 'ontrack-cli' });
        const execDep = makeExec();
        const github = makeGithub({ runNumber: 7 });
        await runAction({ core, exec: execDep, github });
        expect(execDep.exec).toHaveBeenCalledWith(
            'ontrack-cli',
            expect.arrayContaining(['--build', 7]),
        );
    });
});

describe('runAction — flag composition', () => {
    test('adds --release when release input is provided', async () => {
        const core = makeCore({ executable: 'ontrack-cli', release: '1.2.3' });
        const execDep = makeExec();
        const github = makeGithub();
        await runAction({ core, exec: execDep, github });
        expect(execDep.exec).toHaveBeenCalledWith(
            'ontrack-cli',
            expect.arrayContaining(['--release', '1.2.3']),
        );
    });

    test('does not add --release when release input is empty', async () => {
        const core = makeCore({ executable: 'ontrack-cli' });
        const execDep = makeExec();
        const github = makeGithub();
        await runAction({ core, exec: execDep, github });
        const callArgs = execDep.exec.mock.calls[0][1];
        expect(callArgs).not.toContain('--release');
    });

    test('adds run-info args when runInfo === "true"', async () => {
        const core = makeCore({ executable: 'ontrack-cli', runInfo: 'true' });
        const execDep = makeExec();
        const github = makeGithub({ eventName: 'pull_request' });
        await runAction({ core, exec: execDep, github });
        expect(execDep.exec).toHaveBeenCalledWith(
            'ontrack-cli',
            expect.arrayContaining([
                '--source-type', 'github',
                '--source-uri', 'https://github.com/my-org/my-repo/actions/runs/999',
                '--trigger-type', 'pull_request',
            ]),
        );
    });

    test('does not add run-info args when runInfo input is empty', async () => {
        const core = makeCore({ executable: 'ontrack-cli' });
        const execDep = makeExec();
        const github = makeGithub();
        await runAction({ core, exec: execDep, github });
        const callArgs = execDep.exec.mock.calls[0][1];
        expect(callArgs).not.toContain('--source-type');
    });
});

describe('runAction — workflowRun handling', () => {
    test('calls exec a second time when workflowRun === "true"', async () => {
        const core = makeCore({ executable: 'ontrack-cli', workflowRun: 'true' });
        const execDep = makeExec();
        const github = makeGithub();
        await runAction({ core, exec: execDep, github });
        expect(execDep.exec).toHaveBeenCalledTimes(2);
        expect(execDep.exec.mock.calls[1][1]).toEqual(expect.arrayContaining([
            'build',
            'set-property',
            'generic',
            '--property',
            'net.nemerosa.ontrack.extension.github.workflow.BuildGitHubWorkflowRunPropertyType',
        ]));
    });

    test('does not call exec a second time when workflowRun input is empty', async () => {
        const core = makeCore({ executable: 'ontrack-cli' });
        const execDep = makeExec();
        const github = makeGithub();
        await runAction({ core, exec: execDep, github });
        expect(execDep.exec).toHaveBeenCalledTimes(1);
    });
});

describe('runAction — invocation contract', () => {
    test('calls exec with the executable input', async () => {
        const core = makeCore({ executable: 'custom-cli-name' });
        const execDep = makeExec();
        const github = makeGithub();
        await runAction({ core, exec: execDep, github });
        expect(execDep.exec).toHaveBeenCalledWith('custom-cli-name', expect.any(Array));
    });

    test('passes --commit set to github.context.sha', async () => {
        const core = makeCore({ executable: 'ontrack-cli' });
        const execDep = makeExec();
        const github = makeGithub({ sha: 'deadbeef' });
        await runAction({ core, exec: execDep, github });
        expect(execDep.exec).toHaveBeenCalledWith(
            'ontrack-cli',
            expect.arrayContaining(['--commit', 'deadbeef']),
        );
    });
});
