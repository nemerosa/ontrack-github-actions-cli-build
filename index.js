const core = require('@actions/core');
const exec = require('@actions/exec');
const github = require('@actions/github');

(async () => {
    try {
        await setup();
    } catch (error) {
        core.setFailed(error.message);
    }
})();

async function setup() {
    // Get the basic Yontrack information
    let project = core.getInput("project")
    let branch = core.getInput("branch")
    if (!project) {
        project = github.context.repo.repo
    }
    if (!branch) {
        const branchPrefix = 'refs/heads/';
        if (github.context.ref.startsWith('refs/heads/')) {
            branch = github.context.ref.substring(branchPrefix.length);
        } else {
            throw `Ref not supported: ${github.context.ref}`
        }
    }

    // Build name
    let buildName = core.getInput("build")
    if (!buildName) {
        buildName = github.context.runNumber
    }

    // Logging
    const loggingInput = core.getInput("logging");
    const logging = loggingInput === 'true' || loggingInput === true
    console.log(`Project: ${project}`)
    console.log(`Branch: ${branch}`)
    console.log(`Build name: ${buildName}`)

    // CLI command to prepare
    const executable = core.getInput("executable")
    let args = [
        "build",
        "setup",
        "--project", project,
        "--branch", branch,
        "--build", buildName,
    ]

    // Commit
    args.push("--commit", github.context.sha)

    // Release
    const release = core.getInput("release")
    if (release) {
        args.push("--release", release)
    }

    // Run info
    const runInfoInput = core.getInput("runInfo")
    if (runInfoInput === 'true' || runInfoInput === true) {
        const runUrl = getWorkflowRunUrl()
        args.push("--source-type", "github", "--source-uri", runUrl, "--trigger-type", github.context.eventName)
    }

    // Logging
    if (logging) {
        console.log(`CLI ${executable} `, args)
    }
    // Running the command
    await exec.exec(executable, args)

    // Workflow run
    const workflowRunInput = core.getInput("workflowRun")
    if (workflowRunInput === 'true' || workflowRunInput === true) {
        await setWorkflowRun(logging, project, branch, buildName)
    }
}

async function setWorkflowRun(logging, project, branch, buildName) {
    // Property value
    const value = {
        workflows: [
            {
                runId: github.context.runId,
                url: getWorkflowRunUrl(),
                name: github.context.workflow,
                runNumber: github.context.runNumber,
                running: false,
                event: github.context.eventName,
            }
        ]
    }
    // CLI command to prepare
    const executable = core.getInput("executable")
    let args = [
        "build",
        "set-property",
        "--project", project,
        "--branch", branch,
        "--build", buildName,
        "generic",
        "--property", "net.nemerosa.ontrack.extension.github.workflow.BuildGitHubWorkflowRunPropertyType",
        "--value", JSON.stringify(value),
    ]
    if (logging) {
        console.log(`CLI ${executable} `, args)
    }
    await exec.exec(executable, args)
}

function getWorkflowRunUrl() {
    return `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;
}
