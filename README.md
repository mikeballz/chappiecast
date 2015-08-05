# Node server that uses websockets to spread a video across multiple webviews

## Instructions
* Clone the repo
* `npm install`
* `bower install`
* `npm start` to start the server
* Client windows go to localhost:5000
* Control window lives at localhost:5000/control.html
  * Opening more than one control window will probably ruin your day
* The cordova app lives in the `app` directory
  * `app/www/index.html` needs to be manually updated whenever `index.html` changes
  
### May the (chappie) be with you