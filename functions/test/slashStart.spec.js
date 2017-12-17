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

const myFunctions = require('../index');

/* Tests */
describe('slashStart', () => {
  let refMock;
  let totalMockCalls = 0;
  beforeEach(() => {
    // Custom admin database mock for testing the slashStart function
    refMock = jest.fn(location => {
      let callIndex = 0;
      return {
        push: jest.fn(() => {
          totalMockCalls++;
          callIndex++;
          // console.log(`${location} ${callIndex}: Mock push()ing data, returning new refMock`);
          return refMock(`${location} new data`);
        }),
        set: jest.fn(data => {
          totalMockCalls++;
          callIndex++;
          // console.log(`${location} ${callIndex}: Mock set()ing data:`, data);
          const snapshotMock = {
            ref: location,
            val: jest.fn(() => {
              totalMockCalls++;
              return data;
            })
          };
          return Promise.resolve(snapshotMock);
        }),
        child: jest.fn(childName => {
          totalMockCalls++;
          callIndex++;
          // console.log(`${location} ${callIndex}: Mock child(), returning new refMock:`, childName);
          return refMock(childName);
        }),
        once: jest.fn(eventName => {
          totalMockCalls++;
          callIndex++;
          // console.log(`${location} ${callIndex}: Mock once()ing eventName:`, eventName);
          const snapshotMock = {
            val: jest.fn(() => {
              totalMockCalls++;
              return null;
            })
          };
          return Promise.resolve(snapshotMock);
        })
      }
    });

    admin.database = jest.fn(() => ({ref: refMock}))
  });

  test('missing token', done => {
    let mockRequest = {
      body: Object.assign({}, VALID_START_REQUEST_BODY)
    };
    delete mockRequest.body.token;
    const mockResponse = {
      status: (code) => {
        expect(code).toEqual(401);
        return {
          send: jest.fn(text => {
            expect(text).not.toBeNull();
            expect(refMock).not.toHaveBeenCalled();
            done();
          })
        }
      }
    }
    myFunctions.slashStart(mockRequest, mockResponse);
  });

  test('invalid token', done => {
    let mockRequest = {
      body: Object.assign({}, VALID_START_REQUEST_BODY)
    };
    mockRequest.body.token = 'invalid token';
    const mockResponse = {
      status: (code) => {
        expect(code).toEqual(401);
        return {
          send: jest.fn(text => {
            expect(text).not.toBeNull();
            expect(refMock).not.toHaveBeenCalled();
            done();
          })
        }
      }
    }
    myFunctions.slashStart(mockRequest, mockResponse);
  });

  test('bad text', done => {
    let mockRequest = {
      body: Object.assign({}, VALID_START_REQUEST_BODY)
    };
    mockRequest.body.text = 'invalid text';

    const mockResponse = {
      set: jest.fn(),
      status: (code) => {
        expect(code).toEqual(200);
        return {
          send: jest.fn(responseObject => {
            expect(responseObject).toMatchObject({
              response_type: 'ephemeral'
            });
            expect(refMock).not.toHaveBeenCalled();
            done();
          })
        }
      }
    }
    myFunctions.slashStart(mockRequest, mockResponse);
  })

  test('valid poll start', done => {
    let mockRequest = {
      body: Object.assign({}, VALID_START_REQUEST_BODY)
    };
    const mockResponse = {
      set: jest.fn(),
      status: (code) => {
        expect(code).toEqual(200);
        return {
          send: jest.fn(json => {
            console.info('JSON:', json);
            const responseObject = JSON.parse(json);
            expect(responseObject).toMatchObject({
              response_type: 'in_channel'
            });
            expect(totalMockCalls).toEqual(14);
            expect(refMock).toHaveBeenCalledWith('/polls');
            expect(refMock).toHaveBeenCalledWith('/polls new data');
            expect(refMock).toHaveBeenCalledWith('options');
            expect(refMock).toHaveBeenCalledWith('options new data');
            done();
          })
        }
      }
    }
    myFunctions.slashStart(mockRequest, mockResponse);
  });
})