# Node server that uses websockets to spread a video across multiple webviews

## TODO
* Add rotation to clients
* Build cordova app for client to get around mobile browser restrictions
* ~~drag to change video scale~~
* ~~ability to use videos other than the original sample~~
* ~~Persistence on the control screen so devices maintain their positions between reloads~~

## Instructions
* Clone the repo
* `npm install`
* `bower install`
* `npm start` to start the server
* Client windows go to localhost:5000
* Control window lives at localhost:5000/control.html
  * Opening more than one control window will probably ruin your day