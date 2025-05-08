# Jira Issue Transition Github Action

This GitHub Action transitions a Jira issue to a specified status using Basic Authentication (email + API token) against your Jira Cloud instance.

## 🌟 Features

- Authenticate with Jira via Basic Auth
- List available transitions for an issue
- Transition the issue to the desired status
- Continue on error if desired

## Inputs

| Input               | Description                                                                                     | Required | Default |
|---------------------|-------------------------------------------------------------------------------------------------|----------|---------|
| `client-email`      | Jira user email (for Basic Auth)                                                                | yes      |         |
| `client-token`      | Jira API token (for Basic Auth)                                                                 | yes      |         |
| `base-url`          | Base URL of your Jira instance                | yes      |         |
| `issue-key`         | The key of the Jira issue to transition (e.g. `PROJ-123`)                                        | yes      |         |
| `transition-status` | The name of the status to transition to (e.g. `REVERTED`, `IN PROGRESS`)                         | yes      |         |
| `continue-on-error` | If `true`, the action won’t fail the workflow on error                                          | no       | `false` |

## Outputs

| Output              | Description                                      |
|---------------------|--------------------------------------------------|
| `issue-key`         | The key of the Jira issue that was transitioned  |
| `transition-status` | The status to which the issue was transitioned   |

## Example Workflow

```yaml
name: "JIRA: Transition Issue"

on:
  push:
    branches:
      - main

jobs:
  transition-jira:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Transition Jira Issue
        uses: Elfsquad/jira-transition-issue
        with:
          client-email: ${{ secrets.JIRA_USER_EMAIL }}
          client-token: ${{ secrets.JIRA_API_TOKEN }}
          base-url: 'https://elfsquad.atlassian.net'
          issue-key: 'EC-14235'
          transition-status: 'REVERTED'
          continue-on-error: false
```

## 📋 Prerequisites

Before you dive in, make sure you have:

- A Jira account 🧑‍💻


## 🛠 Setup

Setting up this action is as easy as pie 🍰:

1. Step 1: Get your Jira user email address and API token ready.

2. Step 2: Add your Jira base URL and other secrets to your GitHub repository’s secrets.

3. Step 3: Add the action to your workflow.

## 🤝 Contributing

We welcome contributions! Please feel free to fork the repository, make your changes, and submit a pull request.

## ✨ Acknowledgements

A big thank you to everyone who contributes to the ongoing development and maintenance of this action.
