let admin = require('firebase-admin');
const functions = require('firebase-functions');
/* Each language test needs to be in a different
   test class because i18n is initialized once
   per test class
*/
functions.config = jest.fn(() => ({
  mattermost: { language: 'en' }
}));
const i18n = require('../i18n');
const translations = require('../translations.json');

describe('Translate English', () => {
  test('Basic', () => {
    const result = i18n.t('testKey', {});
    expect(result).toEqual(translations.en.translation.testKey);
  });

  test('With Basic Param', () => {
    const testParam = 'foobar';
    const result = i18n.t('testKeyWithParam', { testParam });
    expect(result).toEqual(translations.en.translation.testKeyWithParam.replace('{{ testParam }}', testParam));
  });

  test('With Object Param', () => {
    const testParam = {id: 1, text: 'foobar'};
    const result = i18n.t('testKeyWithObjectParam', { testParam });
    expect(result).toEqual(translations.en.translation.testKeyWithObjectParam.replace('{{ testParam.text }}', testParam.text));
  });

  test('Invalid key', () => {
    const result = i18n.t('invalidKey', {});
    expect(result).toEqual('invalidKey');
  });
});
