const core = require('@actions/core');
const github = require('@actions/github');


const continueOnError = core.getInput('continue-on-error') === 'true';

const getBaseUrl = () => core.getInput('base-url');
const getClientEmail = () => core.getInput('client-email');
const getClientToken = () => core.getInput('client-token');
const getIssueKeys = () => core.getInput('issue-keys')
                              .split(',')
                              .map(key => key.trim());

const getTransitionStatus = () => core.getInput('transition-status');

const getTransitionComment = () => core.getInput('transition-comment');
const getUpdateFields = () => core.getInput('update-fields');

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


const basicAuthHeader = (email, token) => {
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
    
const transitionIssue = async (baseUrl, auth, issueKeys, transitionId) => {
    const url = `${baseUrl}/rest/api/2/issue/${issueKeys}/transitions`;
    const transitionBody = {
        transition: { id: transitionId }
    };
    const json = JSON.stringify(transitionBody, null, 2);

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

const updateIssueFields = async (baseUrl, auth, issueKey, fieldsToUpdate) => {
  const url = `${baseUrl}/rest/api/3/issue/${issueKey}`;
  const transitionBody = {};
  if (fieldsToUpdate?.fields) {
    transitionBody.fields = fieldsToUpdate.fields;
  }
  
  const json = JSON.stringify(transitionBody, null, 2);
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json'
    },
    body: json
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PUT issue fields failed (${res.status}): ${err}`);
  }
}

const updateIssueComment = async (baseUrl, auth, issueKey, comment) => {
  const url = `${baseUrl}/rest/api/2/issue/${issueKey}/comment`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ body: comment })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`POST comment failed (${res.status}): ${err}`);
  }
}

(async function(){
    try{
        const baseUrl = getBaseUrl();
        const clientEmail = getClientEmail();
        const clientToken = getClientToken();
        const issueKeys = getIssueKeys();
        const desiredStatus = getTransitionStatus();
        const transitionComment = getTransitionComment();
        const updateFields = getUpdateFields();
        const auth = basicAuthHeader(clientEmail, clientToken);


        core.info(`📦 Fetching transition ID(s) for "${desiredStatus}"...`);
        for (const key of issueKeys) {
          const transitionId = await getTransitionId(baseUrl, auth, key, desiredStatus);
          await transitionIssue(baseUrl, auth, key, transitionId);
          if(updateFields) {
            await updateIssueFields(baseUrl, auth, key, JSON.parse(updateFields));
          }
          if (transitionComment) {
            await updateIssueComment(baseUrl, auth, key, transitionComment);
          }
          core.info(`✅ ${key} moved to ${desiredStatus}`);
        }


        core.info(`📨 Fetching updated status for issue(s) ${issueKeys}...`);
        const finalStatus = await getUpdatedStatus(          
          baseUrl,
          auth,
          issueKeys[0]
        );

        if (finalStatus.toUpperCase() !== desiredStatus.toUpperCase()) {
          throw new Error(`Transition mismatch: issue is now '${finalStatus}', expected '${desiredStatus}'`);
        }

        core.info(`✅ Successfully transitioned ${issueKeys.join(',')} to '${finalStatus}'`);
        core.setOutput('issue-keys', issueKeys.join(','));
        core.setOutput('transition-status', finalStatus);
        core.setOutput('status', 'success');
    } catch (error) {
        if(!continueOnError){
            core.setFailed(error.message);
        }
        else{
            core.setOutput('issue-keys', '');
            core.setOutput('transition-status', '');
        }
        core.setOutput('status', 'failure');
    }
})();