let admin = require('firebase-admin');
const functions = require('firebase-functions');

const {
  TEST_MM_INTEGRATION_TOKEN,
  TEST_BASE_URL
} = require('./sampleData');

functions.config = jest.fn(() => ({
  mattermost: { token: TEST_MM_INTEGRATION_TOKEN },
  functions: { baseurl: TEST_BASE_URL },
  firebase: {
    credential: admin.credential.applicationDefault(),
    databaseURL: 'https://not-a-project.firebaseio.com',
    storageBucket: 'not-a-project.appspot.com'
  }
}));
const utils = require('../utils');

describe('Summarize Poll', ()=> {
  const dummyPoll = {
    prompt: 'Dummy poll',
    isActive: false,
    options: {
      dummyOptionKey1: {
        label: 'Dummy Option Key 1',
        voteCount: 3
      },
      dummyOptionKey2: {
        label: 'Dummy Option Key 2',
        voteCount: 1
      },
      dummyOptionKey3: {
        label: 'Dummy Option Key 3',
        voteCount: 1
      }
    },
    votes: {
      dummyId1a: {
        optionKey: 'dummyOptionKey1',
        votedAt: '2017-11-27T17:08:00.418Z'
      },
      dummyId2a: {
        optionKey: 'dummyOptionKey2',
        votedAt: '2017-11-28T17:08:00.418Z'
      },
      dummyId1b: {
        optionKey: 'dummyOptionKey1',
        votedAt: '2017-11-29T17:08:00.418Z'
      },
      dummyId1c: {
        optionKey: 'dummyOptionKey1',
        votedAt: '2017-11-30T17:08:00.418Z'
      },
      dummyId3a: {
        optionKey: 'dummyOptionKey3',
        votedAt: '2017-11-28T17:08:00.418Z'
      }
    }
  }
  test('happy path', () => {
    const resultMessage = utils.summarizePoll(dummyPoll);
    expect(resultMessage).toMatchSnapshot();
  });

  test('no votes path', () => {
    let noVotesPoll = utils.deepCopy(dummyPoll);
    noVotesPoll.options.dummyOptionKey1.voteCount = 0;
    noVotesPoll.options.dummyOptionKey2.voteCount = 0;
    noVotesPoll.options.dummyOptionKey2.voteCount = 0;
    delete noVotesPoll.votes;
    const resultMessage = utils.summarizePoll(noVotesPoll);
    expect(resultMessage).toMatchSnapshot();
  });

  test('active poll', () => {
    let activePoll = utils.deepCopy(dummyPoll);
    activePoll.isActive = true;
    const resultMessage = utils.summarizePoll(activePoll);
    expect(resultMessage).toMatchSnapshot();
  })
});