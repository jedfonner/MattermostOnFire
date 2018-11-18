'use strict'
/* Imports and Mocks */
let admin = require('firebase-admin');
const test = require('firebase-functions-test')();

const {
  TEST_MM_INTEGRATION_TOKEN,
  TEST_BASE_URL,
  TEST_USER_ID,
  TEST_POLL_KEY,
  VALID_VOTE_REQUEST_BODY,
  TEST_ACTIVE_POLL,
  TEST_INACTIVE_POLL,
  TEST_OPTIONS,
  TEST_OPTION_KEY1,
  TEST_OPTION_KEY2
} = require('./sampleData');

test.mockConfig({
  mattermost: { token: TEST_MM_INTEGRATION_TOKEN },
  functions: { baseurl: TEST_BASE_URL }
});

const utils = require('../utils');
const myFunctions = require('../index');

/* Tests */
describe('slashVote', () => {
  let refMock;
  beforeAll(() => {
    const databaseStub = jest.fn(() => {
      return {
        ref: refMock
      };
    });
    // This can only be done once
    Object.defineProperty(admin, "database", { get: () => databaseStub });
  });

  it('Should check for a missing token', done => {
    let mockRequest = { body: utils.deepCopy(VALID_VOTE_REQUEST_BODY) };
    delete mockRequest.body.context.token;
    const mockResponse = {
      status: code => {
        expect(code).toEqual(401);
        return {
          send: jest.fn(text => {
            expect(text).not.toBeNull();
            done();
          }),
        };
      },
    };
    myFunctions.slashVote(mockRequest, mockResponse);
  });

  it('Should check for a bad token', done => {
    let mockRequest = { body: utils.deepCopy(VALID_VOTE_REQUEST_BODY) };
    mockRequest.body.context.token = 'invalid token';
    const mockResponse = {
      status: code => {
        expect(code).toEqual(401);
        return {
          send: jest.fn(text => {
            expect(text).not.toBeNull();
            done();
          }),
        };
      },
    };
    myFunctions.slashVote(mockRequest, mockResponse);
  });

  it('Should check for an inactive poll', done => {
    let mockRequest = { body: utils.deepCopy(VALID_VOTE_REQUEST_BODY) };
    console.log('inactive poll MockRequest', mockRequest)
    const mockResponse = {
      set: jest.fn(),
      status: (code) => {
        expect(code).toEqual(200);
        return {
          send: jest.fn(responseObject => {
            expect(refMock).toHaveBeenCalled();
            console.log('iniside mockResponse got responseObject:', responseObject)
            expect(responseObject).toMatchSnapshot();
            done();
          })
        }
      }
    }
    refMock = jest.fn(location => {
      return {
        once: jest.fn(eventName => {
          const snapshotMock = {
            val: jest.fn(() => {
              return TEST_INACTIVE_POLL;
            })
          };
          return Promise.resolve(snapshotMock);
        })
      }
    });
    myFunctions.slashVote(mockRequest, mockResponse);
  });

  it('Should add a new vote for active poll', done => {
    let mockRequest = { body: utils.deepCopy(VALID_VOTE_REQUEST_BODY) };
    mockRequest.body.user_id = 'newUserId';

    let transactionMock = jest.fn(updateFunction => {
      const optionsToUpdate = utils.deepCopy(TEST_OPTIONS);
      const updatedOptions = updateFunction(optionsToUpdate[TEST_OPTION_KEY1]);
      expect(updatedOptions.voteCount).toBe(2);
    });
    let newVoteSetMock = jest.fn();

    refMock = jest.fn(location => {
      if (location === `/polls/${TEST_POLL_KEY}`) {
        return {
          once: jest.fn(eventName => {
            const snapshotMock = {
              val: jest.fn(() => TEST_ACTIVE_POLL)
            };
            return Promise.resolve(snapshotMock);
          })
        }
      } else if (location === `/polls/${TEST_POLL_KEY}/votes/newUserId`) {
        return { set: newVoteSetMock };
      } else if (location === `/polls/${TEST_POLL_KEY}/options/${TEST_OPTION_KEY1}`) {
        return { transaction: transactionMock };
      }
    });

    const mockResponse = {
      set: jest.fn(),
      status: (code) => {
        expect(code).toEqual(200);
        return {
          send: jest.fn(responseObject => {
            expect(refMock).toHaveBeenCalled();
            console.log('iniside mockResponse got responseObject:', responseObject)
            expect(responseObject).toMatchSnapshot();
            expect(newVoteSetMock).toHaveBeenCalledTimes(1);
            expect(transactionMock).toHaveBeenCalledTimes(1);
            done();
          })
        }
      }
    }
    myFunctions.slashVote(mockRequest, mockResponse);
  })

  it('Should edit an existing vote for active poll', done => {
    let mockRequest = { body: utils.deepCopy(VALID_VOTE_REQUEST_BODY) };
    mockRequest.body.context.optionKey = TEST_OPTION_KEY2;

    let decrementTransactionMock = jest.fn(updateFunction => {
      const optionsToUpdate = utils.deepCopy(TEST_OPTIONS);
      const updatedOptions = updateFunction(optionsToUpdate[TEST_OPTION_KEY1]);
      expect(updatedOptions.voteCount).toBe(0);
    });
    let incrementTransactionMock = jest.fn(updateFunction => {
      const optionsToUpdate = utils.deepCopy(TEST_OPTIONS);
      const updatedOptions = updateFunction(optionsToUpdate[TEST_OPTION_KEY2]);
      expect(updatedOptions.voteCount).toBe(1);
    });
    let newVoteSetMock = jest.fn();

    refMock = jest.fn(location => {
      if (location === `/polls/${TEST_POLL_KEY}`) {
        return { once: jest.fn(eventName => {
            const snapshotMock = { val: jest.fn(() => TEST_ACTIVE_POLL) };
            return Promise.resolve(snapshotMock);
          }) };
      } else if (location === `/polls/${TEST_POLL_KEY}/votes/${TEST_USER_ID}`) {
        return { set: newVoteSetMock };
      } else if (location === `/polls/${TEST_POLL_KEY}/options/${TEST_OPTION_KEY1}`) {
        return { transaction: decrementTransactionMock };
      } else if (location === `/polls/${TEST_POLL_KEY}/options/${TEST_OPTION_KEY2}`) {
        return { transaction: incrementTransactionMock };
      }
    });

    const mockResponse = { set: jest.fn(), status: code => {
        expect(code).toEqual(200);
        return { send: jest.fn(responseObject => {
            expect(refMock).toHaveBeenCalled();
            console.log('iniside mockResponse got responseObject:', responseObject);
            expect(responseObject).toMatchSnapshot();
            expect(newVoteSetMock).toHaveBeenCalledTimes(1);
            expect(decrementTransactionMock).toHaveBeenCalledTimes(1);
            expect(incrementTransactionMock).toHaveBeenCalledTimes(1);
            done();
          }) };
      } };
    myFunctions.slashVote(mockRequest, mockResponse);
  });
})