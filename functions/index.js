const functions = require('firebase-functions');
const admin = require('firebase-admin');
const utils = require('./utils');
const i18n = require('./i18n');

admin.initializeApp(functions.config().firebase);

/**
 * Mattermost slash command integration endpoint
 * Creates a new poll in the database and returns markup
 * for showing the poll in Mattermost
 */
exports.slashStart = functions.https.onRequest((req, res) => {
  console.log('Received body: ', req.body);
  /*
  { channel_id: 'qh5bjpmjcfyfjfegj5itb1g99y',
    channel_name: 'just-me',
    command: '/poll',
    response_url: 'not supported yet',
    team_domain: 'engineering',
    team_id: 'kuajmcdmk3d8fgpwka73uefdfr',
    text: 'poll name | action1 | action2 | action3',
    token: 'ton3keo68tnjm8f5k1bktdsyda',
    user_id: '9yrnth1pnbgiiff3ztbmz17d7c',
    user_name: 'jed.fonner'
  }
  */
  if (!utils.isValidSlashRequest(req)) {
    return res.status(401).send(i18n.t('UNAUTHORIZED'));
  }
  const token = req.body.token;
  const textPieces = req.body.text ? req.body.text.split("|") : [];
  if (textPieces.length <= 1) {
    console.info('Did not find valid text, returning');
    const returnObject = {
      "response_type": "ephemeral",
      "text": i18n.t('USAGE')
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
    let attachmentActions = [];
    const optionKeys = optionData ? Object.keys(optionData): [];
    for (const optionKey of optionKeys) {
      const optionValue = optionData[optionKey];
      attachmentActions.push(utils.buildAction('🖐️', optionValue.label, 'yellow', '/slashVote', newPollRef.key, token, optionKey));
    };
    attachmentActions.push(utils.buildAction('🔍', i18n.t('GET_VOTES'), null, '/slashCount', newPollRef.key, token, null));
    attachmentActions.push(utils.buildAction('🏁', i18n.t('CLOSE_POLL'), null, '/slashEnd', newPollRef.key, token, null));

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
    console.error('Error creating poll: ', error);
    const returnObject = { ephemeral_text: i18n.t('ERROR_CREATING', { error }) }
    res.set('Content-Type', 'application/json');
    return res.status(200).send(returnObject);
  })
});

/**
 * Handles clicks by users on poll option buttons
 * This endpoint is attached to each option action returned by `slashStart`
 */
exports.slashVote = functions.https.onRequest((req, res) => {
  console.log('Received body: ', req.body);
  if (!utils.isValidActionRequest(req)) {
    return res.status(401).send(i18n.t('UNAUTHORIZED'));
  }
  const pollKey = req.body.context.pollKey;
  console.log('Poll key', pollKey);
  let message = '';
  const pollRef = admin.database().ref(`/polls/${pollKey}`);
  return pollRef.once('value')
  .then(snapshot => {
    const poll = snapshot.val();
    const isActive = poll && poll.isActive;
    console.log(`Poll ${pollKey} isActive = ${isActive}`)
    if(!isActive) {
      console.info(`Poll ${pollKey} is not active, vote will be discarded`);
      throw i18n.t('POLL_ENDED');
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
          message += i18n.t('PREVIOUS_VOTE_REPLACED', { optionData });
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
        message += i18n.t('VOTE_RECORDED', { optionData });
        console.info(`Incrementing vote count for ${optionKey} (${optionData.label}) to ${optionData.voteCount}`);
      }
      return optionData;
    });
    databasePromises.push(optionIncrementPromise);

    /* ** Update all ** */
    return Promise.all(databasePromises)
  })
  .then(() => {
    const returnObject = { ephemeral_text: i18n.t('THANKS_FOR_VOTING', { message }) }
    res.set('Content-Type', 'application/json');
    return res.status(200).send(returnObject);
  })
  .catch(error => {
    console.error(`Error recording vote for poll ${pollKey}: `, error)
    const returnObject = { ephemeral_text: i18n.t('ERROR_VOTING', {error}) }
    res.set('Content-Type', 'application/json');
    return res.status(200).send(returnObject);
  })
});

/**
 * Deactivates a poll and updates the original poll message with the results
 * This endpoint is attached to the "Close Poll" action button
 * Only returns the summary if triggered by the poll creator
 */
exports.slashEnd = functions.https.onRequest((req, res) => {
  console.log('Received body: ', req.body);
  if (!utils.isValidActionRequest(req)) {
    return res.status(401).send(i18n.t('UNAUTHORIZED'));
  }
  const pollKey = req.body.context.pollKey;
  const pollRef = admin.database().ref(`/polls/${pollKey}`);
  return pollRef.once('value')
  .then(snapshot => {
    const poll = snapshot.val();
    if (!utils.isRequestorOwnerOfPoll(req, poll)){
      const createdByUsername = poll.createdBy;
      console.info(`Someone else tried to close poll ${pollKey} created by ${createdByUsername}`);
      throw i18n.t('POLL_END_PERMISSION', { createdByUsername });
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
    const returnObject = { ephemeral_text: i18n.t('ERROR_ENDING', { error }) }
    res.set('Content-Type', 'application/json');
    return res.status(200).send(returnObject);
  });
});

/**
 * Returns the current poll summary as an ephemeral message
 * This endpoint is attached to the "Get Vote Count" action button
 * Only returns the summary if triggered by the poll creator
 */
exports.slashCount = functions.https.onRequest((req, res) => {
  console.log('Received body: ', req.body);
  if (!utils.isValidActionRequest(req)) {
    return res.status(401).send(i18n.t('UNAUTHORIZED'));
  }
  const pollKey = req.body.context.pollKey;
  const pollRef = admin.database().ref(`/polls/${pollKey}`);
  return pollRef.once('value')
  .then(snapshot => {
    const poll = snapshot.val();
    if (!utils.isRequestorOwnerOfPoll(req, poll)){
      const createdByUsername = poll.createdBy;
      console.info(`Someone else tried to get a vote count of poll ${pollKey} created by ${createdByUsername}`);
      throw i18n.t('POLL_COUNT_PERMISSION', { createdByUsername });
    }
    const summary = utils.summarizePoll(poll);
    const returnObject = { ephemeral_text: summary };
    console.info(`Successfully counted poll ${pollKey}`, returnObject);
    res.set('Content-Type', 'application/json');
    return res.status(200).send(returnObject);
  })
  .catch(error => {
    console.error(`Error counting poll ${pollKey}: `, error);
    const returnObject = { ephemeral_text: i18n.t('ERROR_COUNTING', { error }) }
    res.set('Content-Type', 'application/json');
    return res.status(200).send(returnObject);
  });
})

/**
 * Cleans up inactive polls created more than 90 days ago
 * Triggered by each new poll creation
 */
exports.slashCleanup = functions.database.ref('/polls/{newPollKey}').onCreate(event => {
  const createdTimestamp = new Date(event.timestamp);
  const removeBeforeTimestamp = new Date(createdTimestamp-1000*60*60*24*90); // 90 days old
  var pollsRef = admin.database().ref('/polls');
  return pollsRef
    .orderByChild('createdAt')
    .endAt(removeBeforeTimestamp.toISOString())
    .once('value')
    .then(snapshot => {
      const promiseArr = [];
      const oldPolls = snapshot.val();
      const oldPollKeys = oldPolls ? Object.keys(oldPolls) : [];
      for (const oldPollKey of oldPollKeys) {
        const oldPoll = oldPolls[oldPollKey];
        if (oldPoll.isActive) {
          console.log(`Old poll ${oldPollKey} is still active so not removing`, oldPoll);
        } else {
          console.info(`Removing old poll ${oldPollKey}`, oldPoll);
          const removeRef = admin.database().ref('/polls').child(oldPollKey);
          promiseArr.push(removeRef.remove());
        }
      }
      return Promise.all(promiseArr);
    });
})
