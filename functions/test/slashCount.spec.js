'use strict';
/* Imports and Mocks */
let admin = require('firebase-admin');
admin.initializeApp = jest.fn();
const test = require('firebase-functions-test')();

const {
  TEST_MM_INTEGRATION_TOKEN,
  TEST_BASE_URL,
  VALID_COUNT_REQUEST_BODY,
  TEST_ACTIVE_POLL
} = require('./sampleData');

test.mockConfig({
  mattermost: { token: TEST_MM_INTEGRATION_TOKEN },
  functions: { baseurl: TEST_BASE_URL }
});

const utils = require('../utils');
const myFunctions = require('../index');

describe('slashCount', () => {
  let refMock, databaseStub;

  beforeAll(() => {
    refMock = jest.fn(location => {
      return {
        once: jest.fn(eventName => Promise.resolve({val: jest.fn(() => TEST_ACTIVE_POLL)}))
      };
    })
    databaseStub = jest.fn(() => {
      return {
        ref: refMock
      };
    });
    Object.defineProperty(admin, "database", { get: () => databaseStub });
  });

  it('Should check for a missing token', done => {
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

  it('Should check for a bad token', done => {
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

  it('Should check for insufficient permissions', done => {
    let mockRequest = { body: utils.deepCopy(VALID_COUNT_REQUEST_BODY) };
    mockRequest.body.user_id = 'not poll creator';

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

  it('Should perform a successful count', done => {
    let mockRequest = { body: utils.deepCopy(VALID_COUNT_REQUEST_BODY) };
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
