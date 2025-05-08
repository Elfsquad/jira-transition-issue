const core = require('@actions/core');
const github = require('@actions/github');
const fetch = require('node-fetch')

const octokit = github.getOctokit(core.getInput('github-token'));

const continueOnError = core.getInput('continue-on-error') === 'true';

const getIssueKey = () => core.getInput('issue-key');

const getTransitionStatus = () => core.getInput('transition-status');

const validateState = (value) => {
    const allowedValues = [
      'TO DO', 'BLOCKED', 'REVERTED', 'MORE WORK REQUIRED', 'IN PROGRESS', 
      'IN REVIEW', 'READY TO TEST', 'DONE', 'RELEASED',
    ];
    if (allowedValues.includes(value.toUpperCase())) {
      return;
    }
    throw new Error(`'${value}' is not a valid state.`);
  }

const validateIssueKey = (value) => {
    if(value != "" && value != null && value != undefined){
        return;
    }
    throw new Error('No issue keys provided, at least one issue key is required.');
}

const validateTransitionStatus = (value) => {
    if(value != "" && value != null && value != undefined){
        return;
    }
    throw new Error('No transition status provided, at least one transition status is required.');
}

function basicAuthHeader(email, token) {
    const creds = Buffer.from(`${email}:${token}`).toString('base64');
    return `Basic ${creds}`;
}

const findTransitionId = async (baseUrl, auth, issueKey, targetStatus) => {
    const url = `${baseUrl}/rest/api/2/issue/${issueKey}/transitions`;
    const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: auth,
          Accept: 'application/json'
        }
      });
    if (!res.ok){
        if (res.status === 404) {
        throw new Error(`Issue ${issueKey} not found`);
        } else if (res.status === 403) {
          throw new Error(`Access denied to issue ${issueKey}`);
        } else if (res.status === 401) {
          throw new Error(`Invalid credentials for issue ${issueKey}`);
        } else if (res.status === 400) {
          throw new Error(`Bad request for issue ${issueKey}`);
        } else if (res.status === 500) {
          throw new Error(`Internal server error for issue ${issueKey}`);
        }
    }
    //const body = await res.text();
    const { transitions } = await res.json();
    const match = transitions.find(t =>
        t.to.name.toLowerCase() === targetStatus.toLowerCase()
    );
    if (!match) {
        const names = transitions.map(t => t.to.name).join(', ');
        throw new Error(
          `Cannot move ${issueKey} to "${targetStatus}". Available: ${names}`
        );
    }
    return match.id;
}
    
const transitionIssue = async (baseUrl, auth, issueKey, transitionId) => {
    const url = `${baseUrl}/rest/api/2/issue/${issueKey}/transitions`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: auth,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ transition: { id: transitionId } })
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`POST transition failed: ${res.status} ${body}`);
      }
      const body = await res.json();
      return body;
}

(async function(){
    try{
        const baseUrl = core.getInput('base-url');
        const clientEmail = core.getInput('client-email');
        const clientToken = core.getInput('client-token');
        const issueKey = getIssueKey();
        const transitionStatus = getTransitionStatus();

        const auth = basicAuthHeader(clientEmail, clientToken);

        const tid = await findTransitionId(
          baseUrl, auth, issueKey, transitionStatus
        );

        const result = await transitionIssue(baseUrl, auth, issueKey, tid);
        
        
        validateIssueKey(issueKey);
        validateState(transitionStatus);
        validateTransitionStatus(result.transition.id);

        core.setOutput('issue-key', issueKey);
        core.setOutput('transition-status', result.transition.id);
    }
    catch (error) {
        if(!continueOnError){
            core.setFailed(error.message);
        }
        else{
            core.setOutput('issue-key', '');
            core.setOutput('transition-status', '');
        }
    }
})();