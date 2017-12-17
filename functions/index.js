const functions = require('firebase-functions');
const admin = require('firebase-admin');
const utils = require('./utils');

admin.initializeApp(functions.config().firebase);
// https://firebase.google.com/docs/functions/write-firebase-functions
// const BASE_URL = 'https://us-central1-mattermostonfire.cloudfunctions.net';

exports.slashStart = functions.https.onRequest((req, res) => {
  console.log('Token from env: ', functions.config().mattermost.token);
  console.log('Received body: ', req.body);
  /*
  { channel_id: 'qh5bjpmjcfyfjfegj5itb1g99y',
    channel_name: 'just-me',
    command: '/custompoll',
    response_url: 'not supported yet',
    team_domain: 'engineering',
    team_id: 'kuajmcdmk3d8fgpwka73uefdfr',
    text: 'poll name | action1 | action2 | action3',
    token: 'ton3keo68tnjm8f5k1bktdsyda',
    user_id: '9yrnth1pnbgiiff3ztbmz17d7c',
    user_name: 'jed.fonner'
  }
  */
  // console.log('Received headers: ', req.headers);
  if (!utils.isValidSlashRequest(req)) {
    return res.status(401).send('Invalid request or missing token');
  }
  // const re = /\s*,\s*/;
  const textPieces = req.body.text ? req.body.text.split("|") : [];
  if (textPieces.length <= 1) {
    console.warn('Did not find valid text, returning');
    const returnObject = {
      "response_type": "ephemeral",
      "text": "Please ceate a poll using the following format: /custompoll Poll Name|Option 1|Option2|...|OptionN."
    }
    res.set('Content-Type', 'application/json');
    return res.status(200).send(returnObject);
  }
  const prompt = textPieces[0].trim();
  const options = textPieces.slice(1);
  const createdAt = new Date().toISOString();
  const newPollRef = admin.database().ref('/polls').push();
  const newPollPromise = newPollRef.set({
    createdBy: req.body.user_name,
    createdByUserId: req.body.user_id,
    createdAt,
    teamId: req.body.team_id,
    channelId: req.body.channel_id,
    isActive: true,
    prompt
  });
  // add options separately so they each get a unique key from Firebase
  const newOptionPromises = options.map(option => {
    const newOptionRef = newPollRef.child('options').push();
    return newOptionRef.set({
      label: option.trim(),
      voteCount: 0
    })
  });
  return Promise.all([newPollPromise, ...newOptionPromises])
  .then(() => newPollRef.child('options').once('value'))
  .then(snapshot => {
    const optionData = snapshot.val();
    // console.log('Operating on new poll options', optionData);
    let attachmentActions = [];
    const optionKeys = optionData ? Object.keys(optionData): [];
    for (const optionKey of optionKeys) {
      const optionValue = optionData[optionKey];
      attachmentActions.push(utils.buildAction('🖐️', optionValue.label, 'yellow', '/slashVote', newPollRef.key, optionKey));
    };
    attachmentActions.push(utils.buildAction('🔍', 'Get Vote Count', null, '/slashCount', newPollRef.key, null));
    attachmentActions.push(utils.buildAction('🏁', 'Close Poll', null, '/slashEnd', newPollRef.key, null));

    console.info(`Successfully created poll ${newPollRef.key} and built actions`, attachmentActions);
    // https://docs.mattermost.com/developer/interactive-message-buttons.html
    const returnObject = {
      response_type: 'in_channel',
      attachments: [{ title: prompt, actions: attachmentActions }]
    }
    res.set('Content-Type', 'application/json');
    return res.status(200).send(JSON.stringify(returnObject));
  })
  .catch(error => {
    console.warn('Error creating poll: ', error);
    const returnObject = { ephemeral_text: `There was an error creating your poll: ${error}` }
    res.set('Content-Type', 'application/json');
    return res.status(200).send(returnObject);
  })
});

exports.slashVote = functions.https.onRequest((req, res) => {
  console.log('Received body: ', req.body);
  if (!utils.isValidActionRequest(req)) {
    return res.status(401).send('Invalid request or missing token');
  }
  const pollKey = req.body.context.pollKey;
  console.log('Poll key', pollKey);
  let ephemeralMessage = '';
  const pollRef = admin.database().ref(`/polls/${pollKey}`);
  return pollRef.once('value')
  .then(snapshot => {
    const poll = snapshot.val();
    const isActive = poll && poll.isActive;
    console.log(`Poll ${pollKey} isActive = ${isActive}`)
    if(!isActive) {
      console.warn(`Poll ${pollKey} is not active, vote will be discarded`);
      throw `This poll has ended.`;
    }
    const userId = req.body.user_id;
    const votedAt = new Date().toISOString();
    const optionKey = req.body.context.optionKey;

    let databasePromises = [];
    /* ** Upsert Vote** */
    console.log(`Recording vote for ${optionKey} from ${userId}`);
    const newVoteRef = admin.database().ref(`/polls/${pollKey}/votes/${userId}`);
    const votePromise = newVoteRef.set({ votedAt, optionKey });
    databasePromises.push(votePromise);

    /* ** Previous Voted Option ** */
    const previousVoteOptionKey = poll.votes && poll.votes[userId] && poll.votes[userId].optionKey;
    if (previousVoteOptionKey) {
      console.log(`User ${userId} previously voted for ${previousVoteOptionKey}`);
      const optionDecrementRef = admin.database().ref(`/polls/${pollKey}/options/${previousVoteOptionKey}`);
      const optionDecrementPromise = optionDecrementRef.transaction(optionData => {
        if (optionData) {
          optionData.voteCount--;
          ephemeralMessage += `Your previous vote for **_${optionData.label}_** has been replaced. `
          console.info(`Decrementing vote count for ${previousVoteOptionKey} (${optionData.label}) to ${optionData.voteCount}`);
        }
        return optionData;
      });
      databasePromises.push(optionDecrementPromise);
    }

    /* ** Option Voted For ** */
    const optionIncrementRef = admin.database().ref(`/polls/${pollKey}/options/${optionKey}`);
    const optionIncrementPromise = optionIncrementRef.transaction(optionData => {
      if (optionData) {
        optionData.voteCount++;
        ephemeralMessage += `Your vote for **_${optionData.label}_** has been recorded. `
        console.info(`Incrementing vote count for ${optionKey} (${optionData.label}) to ${optionData.voteCount}`);
      }
      return optionData;
    });
    databasePromises.push(optionIncrementPromise);

    /* ** Update all ** */
    return Promise.all(databasePromises)
  })
  .then(() => {
    const returnObject = { ephemeral_text: `Thanks for voting. ${ephemeralMessage}` }
    res.set('Content-Type', 'application/json');
    return res.status(200).send(returnObject);
  })
  .catch(error => {
    console.error(`Error recording vote for poll ${pollKey}: `, error)
    const returnObject = { ephemeral_text: `Your vote could not be recorded. ${error}` }
    res.set('Content-Type', 'application/json');
    return res.status(200).send(returnObject);
  })
});

exports.slashEnd = functions.https.onRequest((req, res) => {
  console.log('Received body: ', req.body);
  if (!utils.isValidActionRequest(req)) {
    return res.status(401).send('Invalid request or missing token');
  }
  const pollKey = req.body.context.pollKey;
  const pollRef = admin.database().ref(`/polls/${pollKey}`);
  return pollRef.once('value')
  .then(snapshot => {
    const poll = snapshot.val();
    if (!utils.isRequestorOwnerOfPoll(req, poll)){
      const createdByUsername = poll.createdBy;
      console.warn(`Someone else tried to close poll ${pollKey} created by ${createdByUsername}`);
      throw `Only the poll creator can close a poll. Please ask @${createdByUsername} to close it.`;
    }
  })
  .then(() => pollRef.update({isActive: false}))
  .then(() => pollRef.once('value')) // repeat the query in case more votes came in before poll was deactivated
  .then(snapshot => {
    const poll = snapshot.val();
    const message = utils.summarizePoll(poll);
    const returnObject = { update: { message } }
    console.info(`Successfully ended poll ${pollKey}`, returnObject);
    res.set('Content-Type', 'application/json');
    return res.status(200).send(returnObject);
  })
  .catch(error => {
    console.error(`Error ending poll ${pollKey}: `, error);
    const returnObject = { ephemeral_text: `Unable to close the poll. ${error}` }
    res.set('Content-Type', 'application/json');
    return res.status(200).send(returnObject);
  });
});

exports.slashCount = functions.https.onRequest((req, res) => {
  console.log('Received body: ', req.body);
  if (!utils.isValidActionRequest(req)) {
    return res.status(401).send('Invalid request or missing token');
  }
  const pollKey = req.body.context.pollKey;
  const pollRef = admin.database().ref(`/polls/${pollKey}`);
  return pollRef.once('value')
  .then(snapshot => {
    const poll = snapshot.val();
    if (!utils.isRequestorOwnerOfPoll(req, poll)){
      const createdByUsername = poll.createdBy;
      console.warn(`Someone else tried to get a vote count of poll ${pollKey} created by ${createdByUsername}`);
      throw `Only the poll creator can get the vote count. Please ask @${createdByUsername} if you need the count.`;
    }
    const summary = utils.summarizePoll(poll);
    const returnObject = { ephemeral_text: summary };
    console.info(`Successfully counted poll ${pollKey}`, returnObject);
    res.set('Content-Type', 'application/json');
    return res.status(200).send(returnObject);
  })
  .catch(error => {
    console.error(`Error counting poll ${pollKey}: `, error);
    const returnObject = { ephemeral_text: `Unable to get vote count for poll. ${error}` }
    res.set('Content-Type', 'application/json');
    return res.status(200).send(returnObject);
  });
})