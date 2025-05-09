# 🚀 Jira Issue Transition GitHub Action

[![License: AGPL v3](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

Easily move Jira issues to a new status as part of your GitHub workflows.
This GitHub Action supports adding comments and updating fields during the transition, using secure Basic Authentication (email + API token) with Jira Cloud.


## 📑 Table of Contents

- [Features](#-features-)  
- [Inputs](#-inputs-)  
- [Outputs](#-outputs-)  
- [Example Workflow](#-example-workflow-)  
- [Prerequisites](#-prerequisites-)  
- [Setup](#-setup-)  
- [Contributing](#-contributing-)  
- [License](#-license-)  
- [Acknowledgements](#-acknowledgements-)  

---

## 🌟 Features <!-- link: #features -->

- 🔐 Securely authenticate with Jira via Basic Auth  
- 🔁 Get and apply valid transitions for a given issue  
- ✅ Seamlessly update issues as part of your CI/CD pipeline  
- 💬 Optional: Add comments to issues as part of the transition
- 📝 Optional: Update custom fields during the workflow
- 🚧 Optional: allow your pipeline to continue even when Jira fails   

---

## 📥 Inputs <!-- link: #inputs -->

| Input               | Description                                                                                     | Required | Default |
|---------------------|-------------------------------------------------------------------------------------------------|----------|---------|
| `client-email`      | Jira account email (used for Basic Auth)                                                        | ✅ yes   |         |
| `client-token`      | API token associated with the Jira account                                                      | ✅ yes   |         |
| `base-url`          | Your Jira Cloud site URL (e.g. `https://your-org.atlassian.net`)                                | ✅ yes   |         |
| `issue-key`         | The Jira issue key to update (e.g. `PROJ-123`)                                                  | ✅ yes   |         |
| `transition-status` | Desired status name to move the issue into (e.g. `REVERTED`, `DONE`)                           | ✅ yes   |         |
`transition-comment`| *(Optional)* A comment to add after transitioning each issue                                                   |❌ no    |         |
| `update-fields`     | *(Optional)* JSON string of fields to update, e.g. `{"fields":{"customfield_10010":"value"}}`                  |❌ no    |         |
| `continue-on-error` | *(Optional)* If `true`, skips failure when Jira transition fails                                             | ❌ no    | `false` |

---

## 📤 Outputs <!-- link: #outputs -->

| Output              | Description                                        |
|---------------------|----------------------------------------------------|
| `issue-key`         | The key of the issue that was updated              |
| `transition-status` | The status the issue was moved to                  |
| `status`            | `success` or `failure` indicating overall action result        |


---

## 🧪 Example Workflow <!-- link: #example-workflow -->

```yaml
name: "JIRA: Auto-Transition Issue Status"

on:
  pull_request:
    types: [closed]

jobs:
  update-jira:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set Jira Issue Status
        uses: Elfsquad/jira-transition-issue@v1.0.0
        with:
          client-email: ${{ secrets.JIRA_USER_EMAIL }}
          client-token: ${{ secrets.JIRA_API_TOKEN }}
          base-url: 'https://your-org.atlassian.net'
          issue-key: 'PROJ-14235'
          transition-status: 'REVERTED'
          transition-comment: 'Moving to testing phase per CI pipeline.'
          update-fields: '{"fields":{"priority":{"id":"3"}}}'
          continue-on-error: false
```

---

## 🛠 Prerequisites <!-- link: #prerequisites -->

Make sure you have the following:

- A Jira Cloud account with access to the target issue(s)

- An API token from id.atlassian.com

- Secrets (JIRA_USER_EMAIL, JIRA_API_TOKEN) added to your GitHub repo


---

## ⚙️ Setup <!-- link : #setup -->

Setting up this action is as easy as pie 🍰:

1. Step 1: 🔑 Get your Jira user email and generate an API token

2. Step 2: 🔐 Add your credentials as repository secrets

3. Step 3: 📄 Integrate this action in your workflow YAML file

---

## 🤝 Contributing <!-- link: #contributing -->

Contributions are welcome! Please feel free to open issues, fork the repository, make your changes, and submit a pull request.

---

## ⚖️ License <!-- link: #license -->

Licensed under the AGPL-3.0. See the LICENSE file in the repository for full details.

---

## ✨ Acknowledgements <!-- link: #acknowledgements -->

A big thank you to the open source community and Jira users who make automation like this powerful and possible.
