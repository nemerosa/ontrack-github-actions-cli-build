# Ontrack GitHub actions: CLI build

GitHub action to create a build using the [Ontrack CLI](https://github.com/nemerosa/ontrack-cli).

## Prerequisites

The Ontrack CLI must be available. The quickest and recommended way is to use the
[`ontrack-github-actions-cli-setup`](https://github.com/nemerosa/ontrack-github-actions-cli-setup) action.

## Inputs

### `project`

Name of the Ontrack project. If not set, the action will try to get the information
from the current GitHub repository.

### `branch`

Name of the Ontrack branch.If not set, the action will try to get the information
from the current Git branch.

### `build`

Name of the build to create. Use a default name if not provided.

### `release`

Release label to associate with the build.

### `runInfo`

Associates some run info with the build (duration, trigger, etc.).

### `workflowRun`

Associates the build to a link to the workflow run

## Outputs

None.

## Example usage

Creating a build with a given name and default setup:

```yaml
- name: Creating the build
  uses: nemerosa/ontrack-github-actions-cli-build@v1
  with:
    release: ${{ env.VERSION }}
```

This performs the following actions:

* creates and updates the build
* sets properties like the Git commit, the release (if provided), the link to the current workflow
* sets the run info (if `runInfo` is set to `true`)

## Building

Download the dependencies by running:

```bash
npm install
```

To build the distribution:

```bash
ncc build
```
