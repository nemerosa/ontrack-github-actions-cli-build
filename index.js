async function runAction({ core, exec, github }) {
    let project = core.getInput("project");
    let branch = core.getInput("branch");
    if (!project) {
        project = github.context.repo.repo;
    }
    if (!branch) {
        const branchPrefix = 'refs/heads/';
        if (github.context.ref.startsWith(branchPrefix)) {
            branch = github.context.ref.substring(branchPrefix.length);
        } else {
            throw new Error(`Ref not supported: ${github.context.ref}`);
        }
    }

    let buildName = core.getInput("build");
    if (!buildName) {
        buildName = github.context.runNumber;
    }

    const loggingInput = core.getInput("logging");
    const logging = loggingInput === 'true' || loggingInput === true;
    console.log(`Project: ${project}`);
    console.log(`Branch: ${branch}`);
    console.log(`Build name: ${buildName}`);

    const executable = core.getInput("executable");
    const args = [
        "build",
        "setup",
        "--project", project,
        "--branch", branch,
        "--build", buildName,
    ];

    args.push("--commit", github.context.sha);

    const release = core.getInput("release");
    if (release) {
        args.push("--release", release);
    }

    const runInfoInput = core.getInput("runInfo");
    if (runInfoInput === 'true' || runInfoInput === true) {
        const runUrl = getWorkflowRunUrl();
        args.push("--source-type", "github", "--source-uri", runUrl, "--trigger-type", github.context.eventName);
    }

    if (logging) {
        console.log(`CLI ${executable} `, args);
    }

    await exec.exec(executable, args);

    const workflowRunInput = core.getInput("workflowRun");
    if (workflowRunInput === 'true' || workflowRunInput === true) {
        await setWorkflowRun({ core, exec, github, logging, project, branch, buildName });
    }
}

async function setWorkflowRun({ core, exec, github, logging, project, branch, buildName }) {
    const value = {
        workflows: [
            {
                runId: github.context.runId,
                url: getWorkflowRunUrl(),
                name: github.context.workflow,
                runNumber: github.context.runNumber,
                running: false,
                event: github.context.eventName,
            },
        ],
    };
    const executable = core.getInput("executable");
    const args = [
        "build",
        "set-property",
        "--project", project,
        "--branch", branch,
        "--build", buildName,
        "generic",
        "--property", "net.nemerosa.ontrack.extension.github.workflow.BuildGitHubWorkflowRunPropertyType",
        "--value", JSON.stringify(value),
    ];
    if (logging) {
        console.log(`CLI ${executable} `, args);
    }
    await exec.exec(executable, args);
}

function getWorkflowRunUrl() {
    return `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;
}

module.exports = { runAction, setWorkflowRun, getWorkflowRunUrl };

if (process.env.NODE_ENV !== 'test') {
    (async () => {
        const core = (await import('@actions/core')).default;
        const exec = (await import('@actions/exec')).default;
        const github = (await import('@actions/github')).default;
        try {
            await runAction({ core, exec, github });
        } catch (error) {
            core.setFailed(error.message);
        }
    })();
}
