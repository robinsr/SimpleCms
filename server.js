var path = require('path')
  , fs = require('fs')
  , logger = require('./logger')
  , app = require('http').createServer(serve)
  , util = require('util')
  , cmspass = require('./auth/cmspass')
  , multipart = require('multipart')
  , nodeurl = require('url');

var settings = [];
refreshsettings();// defaults, etc.

function serve(req,res){
    
    function getPath(req, cb){
        var parsed = nodeurl.parse(req.url);
        var patharray = parsed.path.split('/');
        cb(patharray);
    }
    
    getPath(req, function(patharray){
        if (patharray[1]){
            switch (patharray[1]){
                case 'auth':
                    logger.log('info','+++++++++++++++++++++++++++ AUTH DETECTED +++++++++++++++++++++++++++')
                    authcheck(req,res);                             // auth check to check credentials
                    break;
                case 'landingpages':
                    var jsondoc = '.'+req.url+'.json';
                    forwardPageHandler(jsondoc, req, res);
                    break;
                case 'resources':
                    handler(req,res);
                    break;
                default:
                    var jsondoc = "./jsondocs"+req.url+'.json';
                    forwardPageHandler(jsondoc, req, res);
                    break;
            }
        } else {
            var jsondoc = './jsondocs/index.json';
            forwardPageHandler(jsondoc, req, res);
        }
    })
}
function compilePageParts(a,res,pview){  // compile all the parts of the page and send out

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
                            if (a.hidetitle){
                                page += '';                      // added sunday night feb 17
                            }else{
                                page += b;
                            }
                            getHTML(a,function(b){
                                page +=b;
                                complileReadFile('footer',a,function(b){ 
                                    page += b;
                                    replaceCurlyTags(page, function(ret){
                                        if (!pview){
                                            res.writeHead(200, { 'Content-Type': "text/html" });    // after page is complete
                                            res.end(ret, 'utf-8');
                                        } else {
                                            fs.writeFile('./auth/preview.html', ret, function(err){
                                                if (err) {logger.log('info','error making preview');}
                                            });
                                            res.writeHead(200, { 'Content-Type': "text/html" });    // after page is complete
                                            res.end();
                                        }
                                    });
                                });
                            });  
                        }); 
                    });
                });
            });
        });
    });
}
function complileCssLink(a,cb){
        var b ="";
        for(i=0;i<a.css.length;i++){
            b += "<link rel='stylesheet' type='text/css' href='/resources/CSS/";
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
        b += settings.htmlprepagetitle.value;
        b += a.title;
        b += settings.htmlpostpagetitle.value;
    } else {
        b += settings.htmlprepagetitle.value;
        b += settings.titledefault.value;
        b += settings.htmlpostpagetitle.value;
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
    var data = '<title>'+settings.titledefault.value+'</title>\n';
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
            str = settings.navdefault.value;
            break;
        case 'css':
            filePath = './resources/CSS/';
            obj = a.css;
            break;
    }
    if (obj){
        for(i=0;i<obj.length;i++){
            var fileName = filePath + obj[i].file;
            logger.log('info','compiler asking for '+fileName);
            fs.exists(fileName, function(ex){
                fs.readFile(fileName, 'utf-8', function(err,c){
                    if (err){
                        logger.log('info','cant read '+fileName);
                    } else {
                        data = c.toString();
                        cb(data);
                        //logger.log('info',data);
                    }
                });
            });
        }
        
    }else if(str){
        var fileName = filePath + str;
            logger.log('info','compiler asking for '+fileName);
            fs.exists(fileName, function(ex){
                fs.readFile(fileName, function(err,c){
                    if (err){
                        logger.log('info','cant read '+fileName);
                    } else {
                        var data = c.toString();
                        //logger.log('info',data);
                        cb(data);
                        return;
                    }
                });
            });
    }else{
        logger.log('info','theres no '+type+'?');
        var b = '\n';
        cb(b);
    }
}
function sendTo404Page(res,req){  // handles compile 404, file 404 is handled elsewhere 
    fs.readFile('./jsondocs/fourohfour.json', function(error, content){
        if (error){
            } else {
            //logger.log('info','page found, starting compiler');
            var json = JSON.parse(content);
            var pview = null;
            compilePageParts(json, res, pview);
            return;
        }
    });
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
    if (req.url == '/auth/jsondocs' || req.url == '/api/filelist'){  // api call
        dirname = "./jsondocs";
        filetype = ".json";
        returnfiles(dirname, filetype, res);
    } else if (req.url == '/auth/errorpages'){
        dirname = './errorpages';
        filetype = '.json';
        returnfiles(dirname, filetype, res) 
    } else if (req.url == '/auth/landingpages'){
        dirname = './landingpages';
        filetype = '.json';
        returnfiles(dirname, filetype, res)
    } else if (req.url == '/auth/drafts'){
        dirname = './drafts';
        filetype = '.json';
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
    } else if (req.url == '/auth/message'){
        viewLog('./message.log', settings.MessageLogLines.value,req,res);
        return;
    } else if (req.url == '/auth/activity'){
        viewLog('./activity.log', settings.MessageLogLines.value,req,res);
        return;
    } else if (req.url == '/auth/imagelibrary'){
        dirname = "./resources/Images";
        filetype = ".jpg";
        returnfiles(dirname, filetype, res)
    } else if (req.url != '/auth/csslist' && req.url != '/auth/filelist' && req.url != '/auth/headers' && req.url != '/auth/footers' && req.url != '/auth/nav' && req.url != '/auth/message' && req.url != '/auth/activity' && req.url != '/auth/imagelibrary'){
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
                contentType = 'application/json';
                break;
            case '.svg':
                contentType = 'image/svg+xml';
                break;
            case '.ttf':
                contentType = 'application/x-font-ttf';
                break;
            case '.otf':
                contentType = 'application/x-font-opentype';
                break;
            case '.woff':
                contentType = 'application/x-font-woff';
                break;
            case '.eot':
                contentType = 'application/vnd.,s-fontobject';
                break;

        }
        
        //if (extname == '.js'){
         //   logger.log('info',filePath);
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
            if (ret.destination == 'jsondocs' || ret.destination == 'drafts'){
                if (ret.display === true){
                    var resText = '';
                    var liveFileName = "./jsondocs/"+ret.url;
                    var draftFileName = './drafts/'+ret.url;
                    var jsonstring = JSON.stringify(ret);
                    saveDoc(liveFileName,jsonstring, function(code){
                        if(code == 'success'){
                            resText += 'File saved successfully to ./jsondocs\n';
                            removeDoc(draftFileName, function(code){
                                if(code == 'success'){
                                    resText += 'File removed from ./drafts\n';
                                }else{
                                    resText += 'Error removing file from ./drafts\n';
                                }
                                res.writeHead(200, { 'Content-Type': 'text/event-stream' });                        
                                res.end(resText);
                            });
                        }else{
                            resText += 'Error saving file to ./jsondocs\n';
                            res.writeHead(200, { 'Content-Type': 'text/event-stream' });                        
                            res.end(resText);
                        }
                    });          
                } else {
                    var resText = '';
                    var liveFileName = "./jsondocs/"+ret.url;
                    var draftFileName = './drafts/'+ret.url;
                    var jsonstring = JSON.stringify(ret);
                    saveDoc(draftFileName,jsonstring, function(code){
                        if(code == 'success'){
                            resText += 'File saved successfully to ./drafts\n';
                            removeDoc(liveFileName, function(code){
                                if(code == 'success'){
                                    resText += 'File saved removed from ./jsondocs\n';
                                    res.writeHead(200, { 'Content-Type': 'text/event-stream' });                        
                                    res.end(resText);
                                }else{
                                    resText += 'Error removing file from ./jsondocs\n';
                                    res.writeHead(200, { 'Content-Type': 'text/event-stream' });                        
                                    res.end(resText);
                                }
                            });
                        }else{
                            resText += 'Error saving file to ./drafts\nArticle might still be live';
                                res.writeHead(200, { 'Content-Type': 'text/event-stream' });                        
                                res.end(resText);
                        }
                    });
                }
            } else if (ret.destination == 'errorpages' || ret.destination == 'landingpages'){
                var resText = '';
                var FileName = './'+ret.destination+'/'+ret.url;
                var jsonstring = JSON.stringify(ret);
                saveDoc(FileName,jsonstring, function(code){
                    if(code == 'success'){
                        resText += 'File saved successfully to '+ret.destination+'\n';
                    }else{
                        resText += 'Error saving  to '+ret.destination+'\n';
                    }
                    res.writeHead(200, { 'Content-Type': 'text/event-stream' });                        
                    res.end(resText);
                });
            } 
        });
    }); 
    } else if (req.method == 'POST' && req.url == '/auth/deletefile'){ // deletes a json or css file
        req.on('data', function(chunk) {
      
            var a = JSON.parse(chunk);
            logger.log('info',util.inspect(a));
            
            var path;
        
            switch (a.type){
                case 'jsondocs':
                    path = "./jsondocs/"+a.file;       
                    break;
                case 'drafts':
                    path = "./drafts/"+a.file;
                    break;
                case 'errorpages':
                    path = "./errorpages/"+a.file;
                    break;
                case 'landingpages':
                    path = "./landingpages/"+a.file;
                    break;
                case 'css':
                    path = "./resources/CSS/"+a.file;
                    break;
            }
            
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
        logger.log('info',util.inspect(a));
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
     
    } else if (req.method == 'POST' && req.url == '/auth/quickpreview'){
        var savedata = '';
        req.on('data', function(chunk) {
            savedata += chunk;
        });
        req.on('end', function(){
            var a = JSON.parse(savedata);
            constructhtml(a, function(ret){
                var pview = true;
                compilePageParts(ret,res, pview);
            });
        });
    } else if (req.method == 'POST' && req.url == '/auth/compileIndex'){
        compileIndex(function(ret){
            res.writeHead(200, { 'Content-Type': 'text/event-stream' });
            res.end(ret);
        });
    } else if (req.method == 'POST' && req.url == '/auth/searchIndex'){
         var data = '';
        req.on('data', function(chunk) {
            data += chunk;
        });
        req.on('end', function(){
            searchIndex(data, function(){

            });
        });
    } else if (req.method == 'POST' && req.url == '/auth/imageloader'){
        upload_files(req, res);
    }
}
function refreshsettings(){
    fs.readFile('./auth/settings.json', function(error, content) {
        if (error) {
            logger.log('info','refreshsettings: there was an error readding the settings file!!');
        } else {           
            settings = JSON.parse(content);
            logger.log('info','settings are: '+settings.htmlprepagetitle.value);
        }
    });
}
function constructhtml(a, callback){    // when saving an article in the editor, this compiles the html
    logger.log('info','construct running');   // that will be served up when the page compiles.
    var html = "<article>";         // this section is specific to how my blog pages are structured
  for(i=0;i<a.content.length; i++){
    var d = "";
    
    if (a.content[i].type !== 'HTML'){
          var clean = a.content[i].text;
          clean = clean.replace(/\</g,"&lt;");       // added sunday night Feb 17
          clean = clean.replace(/\>/g,"&gt;");
        } 
    
        if (a.content[i].type == 'p'){
          d = "<p>";
          d += clean;
          d += "</p>\n\n";
        } else if (a.content[i].type == 'h2'){
          d = "<h2>";
          d += clean;
          d += "</h2>\n\n";
        } else if (a.content[i].type == 'pre'){ 
          d = "<div class='codebox'><header>Code</header><pre class='prettyprint linenums'><code>";
          d += clean;
          d += "</code></pre></div>\n\n";
        } else if (a.content[i].type == 'HTML'){
            d += a.content[i].text;
            d += "\n";
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
                logger.log('info','found '+files.length+' files in '+d);
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
function saveDoc(fn,json,cb){
    fs.writeFile(fn, json, function(err){
        if (err){
            logger.log('activity','Error saving ('+fn+') Error: '+err);
            cb('fail');
        } else {
            logger.log('activity',fn+' saved successfully');
            cb('success');
        }
    });
}
function removeDoc(fn,cb){
    logger.log('info','removing '+fn);
    fs.unlink(fn, function(err){
        if (err){
            logger.log('activity','Error unlinking file ('+fn+') Error: '+err);
            cb('fail');
        } else {
            logger.log('activivty',fn+' unlinked successfully');
            cb('success');
        }
    });
}
function forwardPageHandler(path,req,res){
     // checks to see if there is a corresponding artcle
                                                        // in the jsondocs directory    
            logger.log('activity','Serving up article: '+path)
            fs.exists(path, function(ex){
                fs.readFile(path, function(error, content){
                    if (error){
                            //logger.log('info','not found, redirecting');  // if not then 404
                        sendTo404Page(res,req);
                        } else {
                        //logger.log('info','page found, starting compiler'); // if yes then compile the page
                        var json = JSON.parse(content);
                        compilePageParts(json, res);
                        return;
                    }
                });
            });
}
function viewLog(fn, linenums, req,res){
    fs.readFile(fn, function (err, content){
        if (err){
            logger.log('info', 'Error in viewLog()');
        } else {
            var result='';
            var contentString = String(content);
            var lines = contentString.split('\n');
            function adLines(l, cb){
                for (i=0;i<l.length;i++){
                    if (i > ((l.length)-linenums)){
                        result += l[i];
                        result += '\n';
                    }
                }
                cb();
            }
            adLines(lines, function(){
                res.writeHead(200, {'Content-Type':'text/plain'});
                res.end(result);
            });
        }
    })
}
function replaceCurlyTags(content,cb){
      var pat = /\{([^}]+)\}\}/g
      var m = null;

      var p = new RegExp(pat);
      while (m = p.exec(content)){
        var q=null;
        q = m[0].replace('{{','').replace("}}",'');
        var strng = String(q);
        if (settings[strng]){
            var MyVar = settings[strng].value;
            content = content.replace(m[0], MyVar)
        } else {
            content = content.replace(m[0], strng+' is not defined');
        }
      }
      cb(content);
}
function compileIndex(cb){
    console.log("compile index running");
    var index = [];
    var allFiles = [];
    var count = 0
    function searchDir(d, cb){
        console.log('Reading directory '+d);
        fs.readdir(d, function(err, files){
            if (err){
                console.log('error creating index step 1')
            } else {
                for (i=0;i<files.length;i++){
                    allFiles.push(d+"/"+files[i]);
                }
            }
            count++
            cb()
        });      
    }
    function indexFiles(a, cb){
        console.log('reading '+a);
        fs.readFile(a, 'utf-8', function(err,c){
            if (err){
                console.log('err reading '+a)
            } else {
                if (path.extname(a) == '.json'){
                    var cpar = JSON.parse(c);
                } else {
                    var cpar = c;
                }
                var o ={
                    "path":a,
                    "content":cpar
                }
                var st = JSON.stringify(o);
                index.push(o);
                count++
                cb();
                return;
            }
        });
    }   
    var directories = [
        "./jsondocs",
        "./drafts",
        "./errorpages",
        "./landingpages",
        "./resources/footers",
        "./resources/headers",
        "./resources/nav",
        ];

    function myLoop1(){
        console.log("myloop1 "+count);
        if (count<directories.length){
            searchDir(directories[count], function(){
            myLoop1();
            });
        } else {
            var strngFiles = JSON.stringify(allFiles);
            //console.log(strngFiles);
            //console.log(strngFiles.length)
            count = 0;
            myLoop2();
            
        }
    }

    function myLoop2(){
        console.log("myloop2 "+count);
        if (count<allFiles.length){
            indexFiles(allFiles[count], function(){
            myLoop2();
            });
        } else {
            var writeable = JSON.stringify(index);
            fs.writeFile("./contentindex.json", writeable, function(err){
                if (err){;
                    console.log('error writing to index file');
                } else {
                    console.log('index complete!');
                    cb(writeable);
                }
            });   
        }
    }
    myLoop1();       
}
function searchIndex(query,cb){
    console.log('searching for '+query);
    fs.readFile("./contentindex.json", 'utf-8', function(err,c){
        if (err){
            logger.log('info','error reading contentindex');
            cb('queryfail');
        } else {
            var indexobj = JSON.parse(c);
            console.log(indexobj[0].content.url);
        }
    })
}
function upload_files(req,res){
    var streamdata = '';
    
    req.on('data', function(chunk){
        streamdata += chunk
    })
    
    req.on('end', function(){
        logger.log('activity', 'request ended, here is the data '+streamdata)
        
        var json = JSON.parse(streamdata);
        
        var base64Image = json.data;
        
        var imgData = base64Image.replace(/^data:image\/\w+;base64,/, "");
        
        var decodedImage = new Buffer(imgData, 'base64');
        
        var decodedImageName = './resources/Images/'+json.filename;
        
        fs.writeFile(decodedImageName, decodedImage, function(err) {
            logger.log('info', 'error writing '+json.filename+' to file');
        });
    });
}


app.listen(8080);




































