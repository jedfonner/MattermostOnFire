const functions = require('firebase-functions');

const MM_INTEGRATION_TOKEN = functions.config().mattermost.token;
const BASE_URL = functions.config().functions.baseurl;

function deepCopy(object) {
  return JSON.parse(JSON.stringify(object));
}

function isValidToken(token){
  return token && token === MM_INTEGRATION_TOKEN;
}

function isValidSlashRequest(req){
  if (req.body && isValidToken(req.body.token)) {
    return true;
  } else {
    console.warn('Invalid request or missing token');
    return false;
  }
}

function isValidActionRequest(req){
  if (req.body && req.body.context && isValidToken(req.body.context.token)) {
    return true;
  } else {
    console.warn('Invalid request or missing token');
    return false;
  }
}

function buildAction(icon, name, color, urlStub, pollKey, optionKey) {
  return {
    name: `${icon} ${name}`,
    color,
    integration: {
      url: BASE_URL + urlStub,
      context: {
        pollKey: pollKey,
        token: MM_INTEGRATION_TOKEN,
        optionKey
      }
    }
  };
}

function isRequestorOwnerOfPoll(request, poll){
  const userId = request.body.user_id;
  const createdByUserId = poll.createdByUserId;
  return userId === createdByUserId;
}

function summarizePoll(poll) {
  const totalVotes = poll.votes ? Object.keys(poll.votes).length : 0;
  let message = poll.isActive ? `Current summary of poll "**${poll.prompt}**"` : `The poll "**${poll.prompt}_**" has closed.`;
  message += `\n`; // Mattermost markdown requires a blank line between text and a table
  message += `\n| OPTION | VOTES: ${totalVotes} | PERCENT |`;
  message += `\n| :----- | -----: | -----: |`;
  const optionData = poll.options;
  const optionKeys = optionData ? Object.keys(optionData): [];
  for (const optionKey of optionKeys) {
    const optionValue = optionData[optionKey];
    const percentage = totalVotes ? Math.round(100*optionValue.voteCount / totalVotes) : '0';
    message += `\n| ${optionValue.label} | ${optionValue.voteCount} | ${percentage}% |`
  }
  return message;
}

module.exports = {
  deepCopy,
  isValidSlashRequest,
  isValidActionRequest,
  buildAction,
  isRequestorOwnerOfPoll,
  summarizePoll
}