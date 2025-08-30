const core = require('@actions/core');
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
    const logging = core.getInput("logging") === 'true' || core.getInput("logging") === true
    console.log(`Project: ${project}`)
    console.log(`Branch: ${branch}`)
    console.log(`Build name: ${buildName}`)
}
