# MattermostOnFire
Backend code for powering a Mattermost [slash command](https://docs.mattermost.com/developer/slash-commands.html) that creates an interactive poll. Contains Firebase Cloud Functions that connect [Mattermost Interactive Buttons](https://docs.mattermost.com/developer/interactive-message-buttons.html) with the Firebase Realtime Database.

## What does this do?
Watch the video:

[![Demo](http://img.youtube.com/vi/PdxepG_h0Xs/0.jpg)](http://www.youtube.com/watch?v=PdxepG_h0Xs "Mattermost on Fire Demo")

## How does it work?
![Diagram](/info/diagram.png "MattermostonFire Diagram")

## Set up
0. Deploy this project to Firebase ([more info](https://firebase.google.com/docs/functions/get-started#set_up_and_initialize_functions_sdk))
1. Create a new Slash command in Mattermost called "poll" or "survey"
2. For Request URL, set the URL of your Firebase Functions `slashStart` function (e.g.,: https://us-central1-myprojecturlstub.cloudfunctions.net/slashStart)
3. Select "POST" for Request Method
4. Fill out the rest of the Slash command configuration as you please, then save
5. Set the Firebase Functions base url (e.g., https://us-central1-myprojecturlstub.cloudfunctions.net) as a Firebase environment variable by running `firebase functions:config:set functions.baseurl="https://[your functions base url]"`
6. Mattermost will generate a unique token for your Slash command. Set that token as a Firebase environment variable by running `firebase functions:config:set mattermost.token="[your token here]"`
7. Check your Firebase environment config by running `firebase functions:config:get` - it should look like:
```
ᐅ firebase functions:config:get
{
  "functions": {
    "baseurl": "https://us-central1-myprojecturlstub.cloudfunctions.net"
  },
  "mattermost": {
    "token": "abcdefghijklmnopqrstuvwxyz"
  }
}
```

## Developing
### Tests
1. Run `npm run test` in the _functions_ directory to ensure that your changes haven't broken any of the functions.
