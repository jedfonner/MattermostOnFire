const functions = require('firebase-functions');
const i18n = require('./i18n');

const MM_INTEGRATION_TOKEN = functions.config().mattermost.token;
const BASE_URL = functions.config().functions.baseurl;

function deepCopy(object) {
  return JSON.parse(JSON.stringify(object));
}

function isValidToken(token){
  var tokens = MM_INTEGRATION_TOKEN ? MM_INTEGRATION_TOKEN.split(',') : [];
  return token && tokens.indexOf(token) !== -1;
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

function buildAction(icon, name, color, urlStub, pollKey, token, optionKey) {
  return {
    name: `${icon} ${name}`,
    color,
    integration: {
      url: BASE_URL + urlStub,
      context: {
        pollKey: pollKey,
        token: token,
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
  let message = poll.isActive ? i18n.t('CURRENT_SUMMARY', { poll }) : i18n.t('CLOSED_SUMMARY', { poll });
  message += '\n'; // Mattermost markdown requires a blank line between text and a table
  message += '\n| '; // Start the table header row
  message += i18n.t('OPTION') + ' | '; // pipe indicates the end of a column
  message += i18n.t('VOTES', { totalVotes }) + ' | ';
  message += i18n.t('PERCENT') +' |';
  message += '\n| :----- | -----: | -----: |'; // align columns left, right, right
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