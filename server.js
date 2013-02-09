var path = require('path')
  , fs = require('fs')
  , logger = require('./logger')
  , app = require('http').createServer(authcheck)
  , util = require('util')
  , UglifyJS = require("uglify-js")
  , cmspass = require('./cmspass');




function authcheck(req, res) {
        var auth = req.headers['authorization'];  // auth is in base64(username:password)  so we need to decode the base64
        logger.log("info","Authorization Header is: ", auth);
 
        if(!auth) {    
                res.statusCode = 401;
                res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
                res.end('<html><body>Need some creds son</body></html>');
        }
        else if(auth) {    // The Authorization was passed in so now we validate it
                var tmp = auth.split(' ');   
                var buf = new Buffer(tmp[1], 'base64'); // create a buffer and tell it the data coming in is base64
                var plain_auth = buf.toString();        // read it back out as a string
                logger.log("info","Decoded Authorization ", plain_auth);
                var creds = plain_auth.split(':');      // split on a ':'
                var username = creds[0];
                var password = creds[1];
                    logger.log("info","login attempt: user: "+creds[0]+" pass: "+creds[1]);
 
                if((username == cmspass.name) && (password == cmspass.pw)) {   // Is the username/password correct?
                        handler(req,res);
                }
                else {
                        res.statusCode = 401; 
                        res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
                        // res.statusCode = 403;  
                        res.end('<html><body>You shall not pass</body></html>');
                }
        }
}
function handler (req, res){

  if (req.method == 'GET') {
      var dirname;
      var filetype;
      //function to compile list of articles stored in .json docs for editing
    if (req.url == '/filelist'){
        dirname = "./jsondocs";
        filetype = ".json";
        returnfiles(dirname, filetype, res)
    } else if (req.url == '/csslist'){
        dirname = "./resources/CSS";
        filetype = ".css";
        returnfiles(dirname, filetype, res)
    } else if (req.url == '/headers'){
        dirname = "./resources/headers";
        filetype = ".html";
        returnfiles(dirname, filetype, res)
    } else if (req.url == '/footers'){
        dirname = "./resources/footers";
        filetype = ".html";
        returnfiles(dirname, filetype, res)
    } else if (req.url != '/csslist' && req.url != '/filelist' && req.url != '/headers'){
      logger.log('info','fetching '+req.url);
      
      var filePath = "."+req.url;
      
      if (filePath == './'){
          filePath = './cms.html';
      }
      
  
        var extname = path.extname(filePath);
        var contentType = 'text/html';
        switch (extname) {
            case '.js':
                contentType = 'text/javascript';
                break;
            case '.css':
                contentType = 'text/css';
                break;
            case '.jpg':
                contentType = 'image/jpeg';
                break;
            case '.json':
                contentType = 'application/json;'
        }
        
        if (extname == '.js'){
            console.log(filePath);
            content = UglifyJS.minify(filePath);
        }
        
        fs.exists(filePath, function(exists) {
     
            if (exists) {
                fs.readFile(filePath, function(error, content) {
                    if (error) {
                        res.writeHead(500);
                        res.end();
                         logger.log('info','warn','there was an error in serving up a file');
                    }
                    else {
                        
                        res.writeHead(200, { 'Content-Type': contentType });
                        res.end(content, 'utf-8');
                    }
                });
            }
            else {
                res.writeHead(404);
                res.end('what happened? 404');
            }
        });
        
    }// end GET section    
  } 
  
  if (req.method == 'POST' && req.url == '/savedata') {
    logger.log('info','this is a post');
  
 
       // saves the data from the text editor into json docs
     req.on('data', function(chunk) {
      logger.log('info',"Received body data:");
      
      var a = JSON.parse(chunk);
        logger.log('info',util.inspect(a));
        
        constructhtml(a, function(ret){
            console.log('callback running');
            
            var fileName = "./jsondocs/"+a.url;
        
            var jsonstring = JSON.stringify(ret);
        
            fs.writeFile(fileName, jsonstring, function(err){
                    if (err){
                        logger.log('info','error writing to file '+err);
                        res.writeHead(200, { 'Content-Type': 'text/event-stream' });
                        res.end('There was a problem saving');
                    } else {
                        logger.log('info','file written successfully');
                        res.writeHead(200, { 'Content-Type': 'text/event-stream' });
                        res.end('File Write Success');
                    }
                });
        });
        
        

     });
    } else if (req.method == 'POST' && req.url == '/deletefile'){
        logger.log('info','delete file going');
        req.on('data', function(chunk) {
        logger.log('info',"Received body data:");
      
            var a = JSON.parse(chunk);
            logger.log('info',util.inspect(a));
            
            var path;
            
            if (a.type == 'file'){
                path = "./jsondocs/"+a.file;
            }
            else if (a.type == 'css'){
                path = "./resources/CSS/"+a.file;
            }
            else {logger.log('info','unrecognized file type???'); return;}
            
            fs.unlink(path, function(err){
                if (err) {
                   res.writeHead(200, { 'Content-Type': 'text/event-stream' });
                    res.end('There was a problem deleting the file'); 
                } else {
                    logger.log('info',"Deleted "+path);
                    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
                    res.end('Delete Success');
                }
            });
            
        });
    } else if (req.method == 'POST' && req.url == '/savecssfile'){
            // currently this function is not used. accomplished with a simple get lol
        logger.log('info','saving CSS');
         req.on('data', function(chunk) {
      logger.log('info',"Received body data:");
      
      var a = JSON.parse(chunk);
        console.log(util.inspect(a));
        

            console.log('received data'); 
            var fileName = "./resources/CSS/"+a.url;
            fs.writeFile(fileName, a.css, function(err){
                    if (err){
                        logger.log('info','error writing to file '+err);
                        res.writeHead(200, { 'Content-Type': 'text/event-stream' });
                        res.end('There was a problem saving');
                    } else {
                        logger.log('info','file written successfully');
                        res.writeHead(200, { 'Content-Type': 'text/event-stream' });
                        res.end('File Write Success');
                    }
                });
     });
    }
}

function constructhtml(a, callback){
    console.log('construct running');
    var html = "";
  for(i=0;i<a.content.length; i++){
    var d = "";
    if (a.content[i].type == 'p'){
      d = "<div class='content'><p>";
      d += a.content[i].text;
      d += "</p>";
    } else if (a.content[i].type == 'h2'){
      d = "<h2>";
      d += a.content[i].text;
      d += "</h2>";
    } else if (a.content[i].type == 'pre'){
      d = "</div><div class='codebox'><header>Code</header><pre class='prettyprint linenums'><code>";
      d += a.content[i].text;
      d += "</code></pre></div><div class='content'>";
    }
    html += d;
  }
  
  a.html = html;
  logger.log('info',html);
  callback(a);
}
function returnfiles(d,ft,res){
    logger.log('info','file search starting in directory '+d);
        fs.readdir(d, function(err, files){
            if (err){
                logger.log('info','error in reading directory');
                res.writeHead(200, { 'Content-Type': 'text/event-stream' });
                res.end('There was an error fetching files');
                return;
            } else {
                logger.log('info','found files');
                var text = [];
                for (i=0;i<files.length;i++){
                    if (path.extname(files[i]) == ft){
                        text.push(files[i]);
                    } else {
                        //do nothing!
                    }
                    
                }
                var message = JSON.stringify(text);
                res.writeHead(200, { 'Content-Type': 'text/event-stream' });
                res.end(message);
                logger.log('info','files sent');
                return;
            }
        });
}


app.listen(8124);

        /*logger.log('info','file search starting');
        fs.readdir('./jsondocs', function(err, files){
            if (err){
                logger.log('info','error in reading directory');
                res.writeHead(200, { 'Content-Type': 'text/event-stream' });
                res.end('There was an error fetching files');
                return;
            } else {
                logger.log('info','found files');
                var text = [];
                for (i=0;i<files.length;i++){
                    if (path.extname(files[i]) == '.json'){
                        text.push(files[i]);
                    } else {
                        //do nothing!
                    }
                    
                }
                var message = JSON.stringify(text);
                res.writeHead(200, { 'Content-Type': 'text/event-stream' });
                res.end(message);
                logger.log('info','files sent');
                return;
            }
        });
    } else if (req.url == '/csslist'){
        logger.log('info','css search starting');
        fs.readdir('./resources/CSS', function(err, files){
            if (err){
                logger.log('info','error in reading directory');
                res.writeHead(200, { 'Content-Type': 'text/event-stream' });
                res.end('There was an error fetching files');
                return;
            } else {
                logger.log('info','found files');
                var text = [];
                for (i=0;i<files.length;i++){
                    if (path.extname(files[i]) == '.css'){
                        text.push(files[i]);
                    } else {
                        //do nothing!
                    }
                    
                }
                var message = JSON.stringify(text);
                res.writeHead(200, { 'Content-Type': 'text/event-stream' });
                res.end(message);
                logger.log('info','css list sent');
                return;
            }
        });*/
