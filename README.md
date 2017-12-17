# MattermostOnFire
Mattermost Slash Commands Using Firebase

## Set up
0. Deploy this project to Firebase ([more info](https://firebase.google.com/docs/functions/get-started#set_up_and_initialize_functions_sdk))
1. Create a new Slash command in Mattermost
2. For Request URL, set the URL of your Firebase Functions `slashStart` function (originall: https://us-central1-mattermostonfire.cloudfunctions.net/slashStart)
3. Select "POST" for Request Method
4. Fill out the rest of the Slash command configuration as you please, then save
5. Set the Firebase Functions base url (e.g., https://us-central1-mattermostonfire.cloudfunctions.net) as a Firebase environment variable by running `firebase functions:config:set functions.baseurl="https://[your functions base url]"`
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