const functions = require('firebase-functions');
const i18next = require('i18next');
const translations = require('./translations.json');
const language = functions.config().mattermost.language;
console.log('Initializing i18n for language: ', language);

i18next.init({
  //debug: true,
  lng: language,
  fallbackLng: 'en',
  defaultNS: 'translation',
  resources: translations
}, (err, t) => {
  if (err) {
    return console.error('Problem initializing translations', err);
  }
  return console.log('Initialized i18n');
});

function t(key, options) {
  return i18next.t(key, options)
}

module.exports = {
  t
}
