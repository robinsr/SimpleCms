var fs = require('fs');

var logger = exports;
  logger.debugLevel = 'info';
  logger.log = function(level, message) {
    d = new Date(),
    day = d.getDate(),
    mo = d.getMonth() + 1,
    yr = d.getFullYear(),
    hr = d.getHours() + 1,
    mn = d.getMinutes();
    if (mn < 10) {mn = "0"+mn}

    var today = mo+"/"+day+"/"+yr+" "+hr+":"+mn;

    var logFile = {
      'debug':'./logs/debug.log',
      'req':'./logs/requests.log',
      'activity':'./logs/activity.log'
    }

    
      if (typeof message !== 'string') {
        message = JSON.stringify(message);
      }
      fs.appendFile(logFile[level], today+" "+message+"\n", function (err) {});
      //console.log('log:', level, message)
    
  }
