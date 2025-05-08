const core = require('@actions/core');
const github = require('@actions/github');


const continueOnError = core.getInput('continue-on-error') === 'true';

const getIssueKey = () => core.getInput('issue-key').split(',')[0].trim();

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

const getUpdatedStatus = async (baseUrl, auth, issueKey) => {
  const url = `${baseUrl}/rest/api/2/issue/${issueKey}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: auth,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch updated issue: ${res.status}`);
  }

  const body = await res.json();
  return body.fields.status.name;
};


const getTransitionId = async (baseUrl, auth, issueKey, targetStatus) => {
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
    return parseInt(match.id, 10);
}
    
const transitionIssue = async (baseUrl, auth, issueKey, transitionId) => {
    const url = `${baseUrl}/rest/api/2/issue/${issueKey}/transitions`;
    core.info(`Transitioning ${issueKey} to "${transitionId}"...`);
    core.info(`URL: ${url}`);
    const transitionBody = {
        transition: { id: transitionId }
    };
    const json = JSON.stringify(transitionBody, null, 2);

    core.info(`Body:  ${json}`);
    const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: auth,
          'Content-Type': 'application/json'
        },
        body: json
      });
      if (!res.ok) {
          const bodyText = await res.text();
          throw new Error(`POST transition failed (${res.status}): ${bodyText}`);
      }
}

(async function(){
    try{
        const baseUrl = core.getInput('base-url');
        const clientEmail = core.getInput('client-email');
        const clientToken = core.getInput('client-token');
        const issueKey = getIssueKey();
        const desiredStatus = getTransitionStatus();
        const auth = basicAuthHeader(clientEmail, clientToken);

        core.info(`📦 Fetching transition ID for "${desiredStatus}"...`);
        const transitionId = await getTransitionId(
          baseUrl,
          auth,
          issueKey,
          desiredStatus
        );

        core.info(`🚀 Sending transition request...`);
        await transitionIssue(         
          baseUrl,
          auth,
          issueKey,
          transitionId
        );

        core.info(`📨 Fetching updated status for issue ${issueKey}...`);
        const finalStatus = await getUpdatedStatus(          
          baseUrl,
          auth,
          issueKey
        );

        if (finalStatus.toUpperCase() !== desiredStatus.toUpperCase()) {
          throw new Error(`Transition mismatch: issue is now '${finalStatus}', expected '${desiredStatus}'`);
        }

        core.info(`✅ Successfully transitioned ${issueKey} to '${finalStatus}'`);
        core.setOutput('issue-key', issueKey);
        core.setOutput('transition-status', finalStatus);
    } catch (error) {
        if(!continueOnError){
            core.setFailed(error.message);
        }
        else{
            core.setOutput('issue-key', '');
            core.setOutput('transition-status', '');
        }
    }
})();