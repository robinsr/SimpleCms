var path = require('path')
  , fs = require('fs')
  , logger = require('./logger')
  , app = require('http').createServer(authcheck)
  , util = require('util');



function authcheck(req, res) {
        var auth = req.headers['authorization'];  // auth is in base64(username:password)  so we need to decode the base64
        console.log("Authorization Header is: ", auth);
 
        if(!auth) {    
                res.statusCode = 401;
                res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
                res.end('<html><body>Need some creds son</body></html>');
        }
        else if(auth) {    // The Authorization was passed in so now we validate it
                var tmp = auth.split(' ');   
                var buf = new Buffer(tmp[1], 'base64'); // create a buffer and tell it the data coming in is base64
                var plain_auth = buf.toString();        // read it back out as a string
                console.log("Decoded Authorization ", plain_auth);
                var creds = plain_auth.split(':');      // split on a ':'
                var username = creds[0];
                var password = creds[1];
 
                if((username == 'ry') && (password == 'guy')) {   // Is the username/password correct?
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
      
      //function to compile list of articles stored in .json docs for editing
    if (req.url == '/filelist'){
        logger.log('info','file search starting');
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
        });
  } else if (req.url != '/csslist' && req.url != '/filelist'){
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
    } else if (req.method == 'POST' && req.url == '/loadcssfile'){
            // currently this function is not used. accomplished with a simple get lol
        logger.log('info','getting CSS for edit');
        req.on('data', function(chunk){
            var a = JSON.parse(chunk);
            logger.log('info','getting CSS for edit: '+a)
            
            var path = "./resources/CSS/"+a;
            
            fs.exists(path, function(ex){
                if (ex){
                    fs.readFile(path, function (err, c){
                        if (err) {
                        res.writeHead(500);
                        res.end();
                         logger.log('info','there was an error in serving up CSS file');
                        }
                        else {
                            var content = {"css":c};
                            var jsonstring = JSON.stringify(content);
                        res.writeHead(200, { 'Content-Type;': 'application/json' });
                        res.end(jsonstring, 'utf-8');
                        }  
                    });
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


app.listen(8124);


