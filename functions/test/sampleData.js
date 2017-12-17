'use strict'
const TEST_MM_INTEGRATION_TOKEN = 'abcdefghijklmnopqrstuvxyz';
const TEST_BASE_URL = 'https://example.com'

/* Example Objects */
const TEST_USER_ID = '9yrnth1pnbgiiff3ztbmz17d7c';
const TEST_POLL_KEY = '-L0U7pAqDqucUnZRdCf3';
const TEST_OPTION_KEY1 = '-L0U7pAxDvJGmB_GJVVL';
const TEST_OPTION_KEY2 = '-L0U7pAxDvJGmB_GJVVM';
const VALID_START_REQUEST_BODY = {
  channel_id: 'qh5bjpmjcfyfjfegj5itb1g99y',
  channel_name: 'just-me',
  command: '/poll',
  response_url: 'not supported yet',
  team_domain: 'engineering',
  team_id: 'kuajmcdmk3d8fgpwka73uefdfr',
  text: 'poll name | action1 | action2 | action3',
  token: TEST_MM_INTEGRATION_TOKEN,
  user_id: TEST_USER_ID,
  user_name: 'jed.fonner'
};
const VALID_VOTE_REQUEST_BODY = {
  user_id: TEST_USER_ID,
  context: {
    optionKey: TEST_OPTION_KEY1,
    pollKey: TEST_POLL_KEY,
    token: TEST_MM_INTEGRATION_TOKEN
  }
};
const VALID_COUNT_REQUEST_BODY = {
  user_id: TEST_USER_ID,
  context: {
    pollKey: TEST_POLL_KEY,
    token: TEST_MM_INTEGRATION_TOKEN
  }
};
const VALID_END_REQUEST_BODY = {
  user_id: TEST_USER_ID,
  context: {
    pollKey: TEST_POLL_KEY,
    token: TEST_MM_INTEGRATION_TOKEN
  }
};
let TEST_OPTIONS = {};
TEST_OPTIONS[TEST_OPTION_KEY1] = {
  label: 'Yes',
  voteCount: 1
};
TEST_OPTIONS[TEST_OPTION_KEY2] = {
  label: 'No',
  voteCount: 0
};
let TEST_VOTES = {};
TEST_VOTES[TEST_USER_ID] = {
  optionKey: TEST_OPTION_KEY1,
  votedAt: '2017-12-16T11:44:04.097Z'
};

const TEST_ACTIVE_POLL = {
  channelId: 'qh5bjpmjcfyfjfegj5itb1g99y',
  createdAt: '2017-12-16T11:43:58.459Z',
  createdBy: 'jed.fonner',
  createdByUserId: TEST_USER_ID,
  isActive: true,
  prompt: 'Does this thing still work?',
  teamId: 'kuajmcdmk3d8fgpwka73uefdfr',
  options: TEST_OPTIONS,
  votes: TEST_VOTES
};

const TEST_INACTIVE_POLL = {
  channelId: 'qh5bjpmjcfyfjfegj5itb1g99y',
  createdAt: '2017-12-16T11:43:58.459Z',
  createdBy: 'jed.fonner',
  createdByUserId: TEST_USER_ID,
  isActive: false,
  prompt: 'Does this thing still work?',
  teamId: 'kuajmcdmk3d8fgpwka73uefdfr',
  options: TEST_OPTIONS,
  votes: TEST_VOTES
};

module.exports = {
  TEST_MM_INTEGRATION_TOKEN,
  TEST_BASE_URL,
  TEST_USER_ID,
  TEST_POLL_KEY,
  TEST_ACTIVE_POLL,
  TEST_INACTIVE_POLL,
  TEST_OPTION_KEY1,
  TEST_OPTION_KEY2,
  TEST_OPTIONS,
  TEST_VOTES,
  VALID_COUNT_REQUEST_BODY,
  VALID_COUNT_REQUEST_BODY,
  VALID_START_REQUEST_BODY,
  VALID_VOTE_REQUEST_BODY
};