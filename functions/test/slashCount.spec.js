'use strict';
/* Imports and Mocks */
let admin = require('firebase-admin');
const functions = require('firebase-functions');

const {
  TEST_MM_INTEGRATION_TOKEN,
  TEST_BASE_URL,
  VALID_COUNT_REQUEST_BODY,
  TEST_ACTIVE_POLL
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
const myFunctions = require('../index');

describe('slashEnd', () => {
  test('missing token', done => {
    let mockRequest = { body: utils.deepCopy(VALID_COUNT_REQUEST_BODY) };
    delete mockRequest.body.context.token;
    const mockResponse = {
      status: code => {
        expect(code).toEqual(401);
        return {
          send: jest.fn(text => {
            expect(text).toMatchSnapshot();
            done();
          })
        };
      }
    };
    myFunctions.slashCount(mockRequest, mockResponse);
  });

  test('bad token', done => {
    let mockRequest = { body: utils.deepCopy(VALID_COUNT_REQUEST_BODY) };
    mockRequest.body.context.token = 'invalid token';
    const mockResponse = {
      status: code => {
        expect(code).toEqual(401);
        return {
          send: jest.fn(text => {
            expect(text).toMatchSnapshot();
            done();
          })
        };
      }
    };
    myFunctions.slashCount(mockRequest, mockResponse);
  });

  test('insufficient permissions', done => {
    let mockRequest = { body: utils.deepCopy(VALID_COUNT_REQUEST_BODY) };
    mockRequest.body.user_id = 'not poll creator';
    let refMock = jest.fn(location => ({
      once: jest.fn(eventName => {
        const snapshotMock = {
          val: jest.fn(() => TEST_ACTIVE_POLL)
        };
        return Promise.resolve(snapshotMock);
      })
    }));
    admin.database = jest.fn(() => ({ ref: refMock }));

    const mockResponse = {
      set: jest.fn(),
      status: code => {
        expect(code).toEqual(200);
        return {
          send: jest.fn(responseObject => {
            expect(refMock).toHaveBeenCalled();
            expect(responseObject).toMatchSnapshot();
            done();
          })
        };
      }
    };
    myFunctions.slashCount(mockRequest, mockResponse);
  });

  test('successful count', done => {
    let mockRequest = { body: utils.deepCopy(VALID_COUNT_REQUEST_BODY) };
    let refMock = jest.fn(location => ({
      once: jest.fn(eventName => {
        const snapshotMock = {
          val: jest.fn(() => TEST_ACTIVE_POLL)
        };
        return Promise.resolve(snapshotMock);
      })
    }));
    admin.database = jest.fn(() => ({ ref: refMock }));

    const mockResponse = {
      set: jest.fn(),
      status: code => {
        expect(code).toEqual(200);
        return {
          send: jest.fn(responseObject => {
            expect(refMock).toHaveBeenCalled();
            expect(responseObject).toMatchSnapshot();
            done();
          })
        };
      }
    };
    myFunctions.slashCount(mockRequest, mockResponse);
  });
});
