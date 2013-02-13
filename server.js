var path = require('path')
  , fs = require('fs')
  , logger = require('./logger')
  , app = require('http').createServer(serve)
  , util = require('util')
  , UglifyJS = require("uglify-js")
  , cmspass = require('./auth/cmspass') 
  , errorpages = require('./errorpages');    // 404 pages stored in strings

var settings = [];
refreshsettings();// defaults, etc.


function serve(req,res){
    
    console.log('getting a request');
    
    var re1='(.)';                  // matches /auth/, any file in this directory requires authentication
    var re2='((?:[a-z][a-z]+))';    // CMS files are stored here
    var re3='(.)';	

    var p = new RegExp(re1+re2+re3,["i"]);
    var m = p.exec(req.url);
    
    if (m){
        //console.log('regex returned a value'); // ie the request url is not blank
        if ((m[0] == "/auth/")||(m[0] == "/auth")){  
            //console.log("sending to auth check");   // match for '/auth'. stop serving files and send to 
            authcheck(req,res);                     // auth check to check credentials
            return;
        } else {
 
        //console.log('no regex value');  // ie, the index page

        var extname = path.extname(req.url); 
        console.log('extname is '+extname);

        if (extname){           // if the request is for a specific file (.js, .json, etc) then there's no need
            handler(req,res);   // no need to compile a page. redirects request to regular file handler
            return;
        } else {

            var jsondoc = "./jsondocs"+req.url+'.json'; // checks to see if there is a corresponding artcle
                                                        // in the jsondocs directory    
            //console.log('searching for '+jsondoc)
            fs.exists(jsondoc, function(ex){
                fs.readFile(jsondoc, function(error, content){
                    if (error){
                            //console.log('not found, redirecting');  // if not then 404
                        sendTo404Page(res,req);
                        } else {
                        //console.log('page found, starting compiler'); // if yes then compile the page
                        var json = JSON.parse(content);
                        compilePageParts(json, res);
                        return;
                    }
                });
            });
            }
        }
    } else {
        console.log('regex returned no value, redirect to index?');  // this handles the index page
        var jsondoc = './jsondocs/index.json';
        fs.exists(jsondoc, function(ex){
                fs.readFile(jsondoc, function(error, content){
                    if (error){
                            //console.log('not found, redirecting');
                        sendTo404Page(res,req);
                        } else {
                        //console.log('page found, starting compiler');
                        var json = JSON.parse(content);
                        compilePageParts(json, res);
                        return;
                    }
                });
            });
    }
}
function compilePageParts(a,res){  // compile all the parts of the page and send out

    var page = "";
    complileReadFile('header',a,function(b){     // compileReadFile reads files on disk and 
        page += b;                                              // returns them in a string
        complileCssLink(a,function(b){
            page += b;
            compileTitle(a,function(b){
                page += b;
                compileHeaderTags(a,function(b){
                    page += b;
                    complileReadFile('nav',a,function(b){
                        page += b;
                        compilePageTitle(a,function(b){
                            page += b;
                            getHTML(a,function(b){
                                page +=b;
                                complileReadFile('footer',a,function(b){  
                                    page += b;
                                    res.writeHead(200, { 'Content-Type': "text/html" });    // after page is complete
                                    res.end(page, 'utf-8');
                                });
                            });  
                        });                           // send it back
                    });
                });
            });
        });
    });
}
function complileCssLink(a,cb){
    var b ="";
    for(i=0;i<a.css.length;i++){
        b += "<link rel='stylesheet' type='text/css' href='./resources/CSS/";
        b += a.css[i].file;
        b += "'> \n";
    }
    cb(b);
}
function compileHeaderTags(a,cb){
    var b = '';
    if (a.headertags){
    b = a.headertags + "</head><body>";
    } else {
    b = "</head><body>";
    }
    cb(b);
}
function compilePageTitle(a,cb){
    var b = '';
    if (a.title){
        b += settings.htmlprepagetitle;
        b += a.title;
        b += settings.htmlpostpagetitle;
    } else {
        b += settings.htmlprepagetitle;
        b += settings.titledefault;
        b += settings.htmlpostpagetitle;
    }
    cb(b);
}
function getHTML(a,cb){
    data = a.html;
    cb(data);
}
function compileTitle(a,cb){
    if (a.title){
    var data = '<title>'+a.title+'</title>\n';
    cb(data);
    } else {
    var data = '<title>'+settings.titledefault+'</title>\n';
    cb(data);
    }
}
function complileReadFile(type, a, cb){

    var filePath = null;
    var obj = null;
    switch(type){
        case 'header':
            filePath = './resources/headers/';
            obj = a.header;
            break;
        case 'footer':
            filePath = './resources/footers/';
            obj = a.footer;
            break;
        case 'nav':
            filePath = './resources/nav/';
            str = settings.navdefault;
            break;
    }
    if (obj){
        for(i=0;i<obj.length;i++){

            var fileName = filePath + obj[i].file;
            console.log('compiler asking for '+fileName);
            fs.exists(fileName, function(ex){
                fs.readFile(fileName, function(err,c){
                    if (err){
                        console.log('cant read '+fileName);
                    } else {
                        var data = c.toString();
                        //console.log(data);
                        cb(data);
                        return;
                    }
                });
            });
        }
    }else if(str){
        var fileName = filePath + str;
            console.log('compiler asking for '+fileName);
            fs.exists(fileName, function(ex){
                fs.readFile(fileName, function(err,c){
                    if (err){
                        console.log('cant read '+fileName);
                    } else {
                        var data = c.toString();
                        //console.log(data);
                        cb(data);
                        return;
                    }
                });
            });
    }else{
        console.log('theres no '+type+'?');
        var b = '\n';
        cb(b);
    }
}
function sendTo404Page(res,req){  // handles compile 404, file 404 is handled elsewhere 
    res.statusCode = 200;  
    res.end(errorpages.fourohfour);
}
function authcheck(req, res) {  // authorization based on username, password, & allowed ip address
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
                        logger.log("info","login attempt: user: "+creds[0]+", pass: "+creds[1]+", ip: "+ip_address);
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
function handler (req, res){  // normal file handler and sorts out api calls coming from the CMS

  if (req.method == 'GET') {
      var dirname;
      var filetype;
      //function to compile list of articles stored in .json docs for editing
    if (req.url == '/auth/filelist'){  // api call
        dirname = "./jsondocs";
        filetype = ".json";
        returnfiles(dirname, filetype, res)
    } else if (req.url == '/auth/csslist'){ // api call
        dirname = "./resources/CSS";
        filetype = ".css";
        returnfiles(dirname, filetype, res) 
    } else if (req.url == '/auth/headers'){ // api call
        dirname = "./resources/headers";
        filetype = ".html";
        returnfiles(dirname, filetype, res)
    } else if (req.url == '/auth/footers'){ // api call
        dirname = "./resources/footers";
        filetype = ".html";
        returnfiles(dirname, filetype, res)
    } else if (req.url == '/auth/nav'){ // api call
        dirname = "./resources/nav";
        filetype = ".html";
        returnfiles(dirname, filetype, res)
    } else if (req.url != '/auth/csslist' && req.url != '/auth/filelist' && req.url != '/auth/headers' && req.url != '/auth/footers' && req.url != '/auth/nav'){
      logger.log('info','fetching '+req.url);
      
      var filePath = "."+req.url;
      
      if ((filePath == './auth')||(filePath == './auth/')){ // index of sorts; for the CMS dashboard
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
        
        //if (extname == '.js'){
         //   console.log(filePath);
         //   content = UglifyJS.minify(filePath);
        //}

        if (filePath == "./server.js"){  // do not serve up the server source, big no no. 
            res.writeHead(200, { 'Content-Type': 'text/plain'});
            res.end("__ what happened? 404"); // instead pretend it doesn't exist
            return;
        }
        
        fs.exists(filePath, function(exists) {  // standard file server
     
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
        
    }
  } 
  
  if (req.method == 'POST' && req.url == '/auth/savedata') {    // saves the data from the text 
    logger.log('info','this is a post');                        // editor into json docs
  
 
        var savedata = '';
     req.on('data', function(chunk) {
      logger.log('info',"Received body data:");
      savedata += chunk;
  });
     req.on('end', function(){
      var a = JSON.parse(savedata);
        logger.log('info',util.inspect(a));

        
        constructhtml(a, function(ret){
            
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
    } else if (req.method == 'POST' && req.url == '/auth/deletefile'){ // deletes a json or css file
        req.on('data', function(chunk) {
      
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
    } else if (req.method == 'POST' && req.url == '/auth/savehfcssfile'){ // saves a css or header/footer file
        var resetsettings = null;
        var savedata = '';
        req.on('data', function(chunk) {
            savedata += chunk;
        });
        req.on('end', function(){
      var a = JSON.parse(savedata);
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
            case 'nav':
                fileName = "./resources/nav/"+a.url;
                break;
            case 'settings':
                fileName = "./auth/settings.json";
                resetsettings = true;
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
                            if (resetsettings === true){
                                refreshsettings();
                            }
                    }
                });
     });
     
    }
}
function refreshsettings(){
    fs.readFile('./auth/settings.json', function(error, content) {
        if (error) {
            logger.log('info','refreshsettings: there was an error readding the settings file!!');
        } else {           
            settings = JSON.parse(content);
            console.log('settings are: '+settings.htmlprepagetitle);
        }
    });
}
function constructhtml(a, callback){    // when saving an article in the editor, this compiles the html
    console.log('construct running');   // that will be served up when the page compiles.
    var html = "<article>";         // this section is specific to how my blog pages are structured
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
        var clean = a.content[i].text;
            clean = clean.replace(/\</g,"&lt;");
            clean = clean.replace(/\>/g,"&gt;");
      d = "</div><div class='codebox'><header>Code</header><pre class='prettyprint linenums'><code>";
      d += clean;
      d += "</code></pre></div><div class='content'>";
    } else if (a.content[i].type == 'HTML'){
        d += a.content[i].text;
    }
    html += d;
  }
  html += '</article>'
  a.html = html;
  logger.log('info',html);
  callback(a);

}
function returnfiles(d,ft,res){  // returns the list of files requested in the api calls above
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
