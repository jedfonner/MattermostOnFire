let admin = require('firebase-admin');
const functions = require('firebase-functions');
/* Each language test needs to be in a different
   test class because i18n is initialized once
   per test class
*/
functions.config = jest.fn(() => ({
  mattermost: { language: 'es' }
}));
const i18n = require('../i18n');
const translations = require('../translations.json');

describe('Translate a 2nd language (Spanish)', () => {
  test('Basic', () => {
    const result = i18n.t('testKey', {});
    expect(result).toEqual(translations.es.translation.testKey);
  });

  test('Fallback for missing translation', () => {
    const result = i18n.t('testKeyOnlyInFallbackLng');
    // note this is pulling from 'en' not 'es'
    expect(result).toEqual(translations.en.translation.testKeyOnlyInFallbackLng);
  });
});