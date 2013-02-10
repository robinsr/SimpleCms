var path =      require('path')
  , fs =        require('fs')
  , logger =    require('./logger')
  , app =       require('http').createServer(serve)
  , util =      require('util')
  , UglifyJS =  require("uglify-js")
  , cmspass =   require('./auth/cmspass');



function serve(req,res){
    
    var re1='(.)';    // Any Single Character 1
    var re2='((?:[a-z][a-z]+))';	// Word 1
    var re3='(.)';	// Any Single Character 2

    var p = new RegExp(re1+re2+re3,["i"]);
    var m = p.exec(req.url);
    
    if (m){
        if ((m[0] == "/auth/")||(m[0] == "/auth")){
            authcheck(req,res);
            return;
        }
    }else {

    //
    //
    // at this point, ive determined if this is admin or user, redirected admin to auth check, onced pass 
    // admin has access to APIs to create and delete files. 
    // now there needs to be a mechanism for templating pages for readers combing"
    //  header file
    //  header tags
    //  navigation file
    //  html section of the articles json file
    //  footer file
    //
    // 
    
    }
}

function authcheck(req, res) {  // authorization based on username, password, allowed ip address
        var auth = req.headers['authorization'];  
        var ip_address = null;
        var ip_addresspass = null;
        if(req.headers['x-forwarded-for']){
            ip_address = req.headers['x-forwarded-for'];
        }
        else {
            ip_address = req.connection.remoteAddress;
        }     
            if(!auth) {    
                    res.statusCode = 401;
                    res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
                    res.end('<html><body>Need some creds son</body></html>');
            }
            else if(auth) {    // The Authorization was passed in so now we validate it
                    var tmp = auth.split(' ');   
                    var buf = new Buffer(tmp[1], 'base64'); 
                    var plain_auth = buf.toString();       
                    //logger.log("info","Decoded Authorization ", plain_auth);
                    var creds = plain_auth.split(':'); 
                    var username = creds[0];
                    var password = creds[1];
                        //logger.log("info","login attempt: user: "+creds[0]+", pass: "+creds[1]+", ip: "+ip_address);
                    for (i=0;i<cmspass.ip.length;i++){  // validate the ip address, only allowed ips get in
                        allowed = cmspass.ip[i];
                        if (String(ip_address) == cmspass.ip[i]){
                            ip_addresspass = true;
                        } 
                    }
     
                    if((username == cmspass.name) && (password == cmspass.pw) && (ip_addresspass === true)) {   // Is the username/password correct?
                            handler(req,res);
                    }
                    else if((username == cmspass.name) && (password == cmspass.pw) && (ip_addresspass !== true)) { // forbidden ip address
                            //res.statusCode = 401; 
                            res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
                            res.statusCode = 403;  
                            res.end('<html><body>Your location is bad</body></html>');
                                logger.log("info","Bad Location")
                    } else {
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
    if (req.url == '/auth/filelist'){
        dirname = "./jsondocs";
        filetype = ".json";
        returnfiles(dirname, filetype, res)
    } else if (req.url == '/auth/csslist'){
        dirname = "./resources/CSS";
        filetype = ".css";
        returnfiles(dirname, filetype, res)
    } else if (req.url == '/auth/headers'){
        dirname = "./resources/headers";
        filetype = ".html";
        returnfiles(dirname, filetype, res)
    } else if (req.url == '/auth/footers'){
        dirname = "./resources/footers";
        filetype = ".html";
        returnfiles(dirname, filetype, res)
    } else if (req.url != '/auth/csslist' && req.url != '/auth/filelist' && req.url != '/auth/headers' && req.url != '/auth/footers'){
      logger.log('info','fetching '+req.url);
      
      var filePath = "."+req.url;
      
      if ((filePath == './auth')||(filePath == './auth/')){
          filePath = './auth/cms.html';
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
  
  if (req.method == 'POST' && req.url == '/auth/savedata') {
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
    } else if (req.method == 'POST' && req.url == '/auth/deletefile'){
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
    } else if (req.method == 'POST' && req.url == '/auth/savehfcssfile'){
            // currently this function is not used. accomplished with a simple get lol
         req.on('data', function(chunk) {
      
      var a = JSON.parse(chunk);
        console.log(util.inspect(a));
        var fileName = null;
        switch (a.doctype){
            case 'header':
                fileName = "./resources/headers/"+a.url;
                break;
            case 'footer':
                fileName = "./resources/footers/"+a.url;
                break;
            case 'css':
                fileName = "./resources/CSS/"+a.url;
                break;
            
        }
            
            fs.writeFile(fileName, a.content, function(err){
                    if (err){
                        logger.log('info','error writing to file '+err);
                        res.writeHead(200, { 'Content-Type': 'text/event-stream' });
                        res.end('There was a problem saving');
                    } else {
                        logger.log('info','file written successfully: '+fileName);
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


app.listen(8080);
