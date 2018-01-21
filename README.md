# MattermostOnFire
[![Build Status](https://travis-ci.org/jedfonner/MattermostOnFire.svg?branch=master)](https://travis-ci.org/jedfonner/MattermostOnFire)

Backend code for powering a Mattermost [slash command](https://docs.mattermost.com/developer/slash-commands.html) that creates an interactive poll. Contains Firebase Cloud Functions that connect [Mattermost Interactive Buttons](https://docs.mattermost.com/developer/interactive-message-buttons.html) with the Firebase Realtime Database.

## What does this do?
Watch the video:

[![Demo](http://img.youtube.com/vi/PdxepG_h0Xs/0.jpg)](http://www.youtube.com/watch?v=PdxepG_h0Xs "Mattermost on Fire Demo")

## How does it work?
![Diagram](/info/diagram.png "MattermostonFire Diagram")

## Set up
Setting this up requires doing some initial Firebase setup, then doing some initial Mattermost setup, then wiring the two systems together.

### Initial Firebase Setup
1. Create a new project in Firebase
1. Clone this repo to a new local folder and `cd` into the new folder
1. Run `cd functions && npm install`
1. Run `firebase login`
1. Run `firebase use --add` and select the Firebase project you created in step 1.
1. Go to your Firebase project settings and note the "Project ID". Your Functions' base url will be `https://us-central1-PROJECTID.cloudfunctions.net` (replace PROJECTID with your Project ID)
1. Set the Firebase Functions base url (e.g., https://us-central1-PROJECTID.cloudfunctions.net) as a Firebase environment variable by running `firebase functions:config:set functions.baseurl="your functions base url"` (starting with https:// and ending without a trailing slash)

### Initial Mattermost Setup
1. Create a new Slash command in Mattermost (I suggest calling it something short, like "poll" or "survey")
1. Select "POST" for Request Method
1. Fill in a dummy Request URL for now, we'll come back and change this in a bit.
1. Fill out the rest of the Slash command configuration as you please, then save
1. Mattermost will generate a unique token for your Slash command.  Note that down.

### Finish Firebase Setup
1. Set the Mattermost token as a Firebase environment variable by running `firebase functions:config:set mattermost.token="your Mattermost token"`
1. Check your Firebase environment config by running `firebase functions:config:get` - it should look like:
```
ᐅ firebase functions:config:get
{
  "mattermost": {
    "token": "abcdefghijklmnopqrstuvwxyz"
  },
  "functions": {
    "baseurl": "https://us-central1-myprojectid.cloudfunctions.net"
  }
}
```
(Note, you may not see the `functions.language` variable if you did not explicitely set it and instead want to use the default. See the [i18n section](#Internationalization).

3. Deploy your project by running `firebase deploy`.
4. When it finishes deploying, it will log the URL for each Function. Note the "Function URL" for `slashStart` (e.g., https://us-central1-PROJECTID.cloudfunctions.net/slashStart)

On a single installation, if you have multiple Mattermost teams and want to use the slash command on each, then you have to register several tokens (one for each slash command created).
For that you can specify multiple tokens in the `mattermost.token` environment configuration variable, separating them using a comma like: `firebase functions:config:set mattermost.token="token1,token2,token3"`

The resulting Firebase environment config would look like:
```
ᐅ firebase functions:config:get
{
  "mattermost": {
    "token": "token1,token2,token3"
  },
  "functions": {
    "baseurl": "https://us-central1-myprojectid.cloudfunctions.net"
  }
}
```

### Finish Mattermost Setup
1. Edit your Mattermost Slash command and update the Request URL to be the URL of your Firebase Functions `slashStart` function

🎉  ALL DONE!

## Internationalization
If you want to use a different language other than English, do the following:
1. Specify the desired language using the [2-letter ISO language code](https://www.sitepoint.com/iso-2-letter-language-codes/) by running `firebase functions:config:set functions.language="YOUR CODE"`.
   * Example: running `firebase functions:config:set functions.language="es"` would configure MattermostOnFire to use Spanish instead of English.
   * This should be done prior to running `firebase deploy`
2. Check your Firebase environment config by running `firebase functions:config:get`. For example, if specifying Spanish then your config would look like:
```
ᐅ firebase functions:config:get
{
  "mattermost": {
    "token": "abcdefghijklmnopqrstuvwxyz"
  },
  "functions": {
    "baseurl": "https://us-central1-myprojectid.cloudfunctions.net",
    "language": "es"
  }
}
```

Make sure that the language you specify is supported. Check that there is a top-level key in [translations](/functions/translations.json) for your desired 2 letter language code.

Please help expand this project's support for more languages by opening a pull request to add a new language to the [translations](/functions/translations.json) file.

## Runtime Monitoring
* You can review the logs for the functions via the Functions > Logs interface of the Firebase Console
* You can introspect the data being generated via the Database interface of the Firebase Console

## Developing

### Running Locally
* See https://firebase.google.com/docs/functions/local-emulator

### Tests
1. Run `npm run test` in the _functions_ directory to ensure that your changes haven't broken any of the functions.
