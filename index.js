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
    // Logging
    if (logging) {
        console.log(`CLI ${executable} `, args)
    }
    // Running the command
    await exec.exec(executable, args)
}
