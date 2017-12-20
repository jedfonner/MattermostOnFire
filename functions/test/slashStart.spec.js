'use strict'
/* Imports and Mocks */
let admin = require('firebase-admin');
const functions = require('firebase-functions');

const {
  TEST_MM_INTEGRATION_TOKEN,
  TEST_BASE_URL,
  TEST_USER_ID,
  TEST_POLL_KEY,
  VALID_START_REQUEST_BODY
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

/* Tests */
describe('slashStart', () => {
  let refMock;
  let newOptionsRefMock;
  let newPollData;
  let options = [];
  beforeEach(() => {
    // Custom admin database mock for testing the slashStart function
    newOptionsRefMock = jest.fn(() => ({
      set: jest.fn(data => {
        options.push(data);
      })
    }));
    let allOptionsRef = {
      push: newOptionsRefMock,
      once: jest.fn(event => {
        const snapshotMock = {
          ref: '/polls/options',
          val: jest.fn(() => {
            return options;
          })
        };
        return Promise.resolve(snapshotMock);
      })
    };
    let newPollRefMock = jest.fn(data => ({
      set: jest.fn(data => {
        newPollData = data;
        const snapshotMock = {
          ref: '/polls',
          val: jest.fn(() => {
            return data;
          })
        };
        return Promise.resolve(snapshotMock);
      }),
      child: jest.fn(location => {
        if (location === 'options') {
          return allOptionsRef;
        }
      })
    }));

    refMock = jest.fn(location => ({push: newPollRefMock}));
    admin.database = jest.fn(() => ({ref: refMock}))
  });

  test('missing token', done => {
    let mockRequest = { body: utils.deepCopy(VALID_START_REQUEST_BODY) };
    delete mockRequest.body.token;
    const mockResponse = {
      status: (code) => {
        expect(code).toEqual(401);
        return {
          send: jest.fn(text => {
            expect(text).toMatchSnapshot();
            expect(refMock).not.toHaveBeenCalled();
            done();
          })
        }
      }
    }
    myFunctions.slashStart(mockRequest, mockResponse);
  });

  test('invalid token', done => {
    let mockRequest = { body: utils.deepCopy(VALID_START_REQUEST_BODY) };
    mockRequest.body.token = 'invalid token';
    const mockResponse = {
      status: (code) => {
        expect(code).toEqual(401);
        return {
          send: jest.fn(text => {
            expect(text).toMatchSnapshot();
            expect(refMock).not.toHaveBeenCalled();
            done();
          })
        }
      }
    }
    myFunctions.slashStart(mockRequest, mockResponse);
  });

  test('bad text', done => {
    let mockRequest = { body: utils.deepCopy(VALID_START_REQUEST_BODY) };
    mockRequest.body.text = 'invalid text';

    const mockResponse = {
      set: jest.fn(),
      status: (code) => {
        expect(code).toEqual(200);
        return {
          send: jest.fn(responseObject => {
            expect(responseObject).toMatchSnapshot();
            expect(refMock).not.toHaveBeenCalled();
            done();
          })
        }
      }
    }
    myFunctions.slashStart(mockRequest, mockResponse);
  })

  test('valid poll start', done => {
    let mockRequest = { body: utils.deepCopy(VALID_START_REQUEST_BODY) };
    const mockResponse = {
      set: jest.fn(),
      status: (code) => {
        expect(code).toEqual(200);
        return {
          send: jest.fn(json => {
            console.info('JSON:', json);
            const responseObject = JSON.parse(json);
            expect(refMock).toHaveBeenCalledTimes(1);
            expect(newOptionsRefMock).toHaveBeenCalledTimes(3); //sample data has 3 actions
            expect(responseObject).toMatchSnapshot();
            done();
          })
        }
      }
    }
    myFunctions.slashStart(mockRequest, mockResponse);
  });
})