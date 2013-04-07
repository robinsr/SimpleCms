var path = require('path')
  , fs = require('fs')
  , logger = require('./logger')
  , app = require('http').createServer(serve)
  , util = require('util')
  , cmspass = require('./auth/cmspass')
  , nodeurl = require('url')
  , events = require('events');

var settings = [];
refreshsettings();// defaults, etc.

var sessionVar = '';

var mimeType = {
    '.js': 'text/javascript',
    '.html': 'text/html',
    '.css': 'text/css',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.ttf': 'application/x-font-ttf',
    '.otf': 'application/x-font-opentype',
    '.woff': 'application/x-font-woff',
    '.eot': 'application/vnd.ms-fontobject',
    '':'text/html'
};

var indexes = {
    '/auth':'/auth/bootstrap/index.html',
    '/auth/':'/auth/bootstrap/index.html'
    
}

var cache = {};

function checkPageCache(url,cb){
    if ((settings.pageCache) &&(settings.pageCache.value == 'true')){
        logger.log('debug','checking cache for '+url);
        if (cache[url]){
            logger.log('debug','cache found');
            cb(cache[url])
        } else {
            logger.log('debug','cache not found');
            cb(false);
        }
    } else {
        logger.log('debug', 'reading cache disabled; '+url);
        cb(false);
    }
}
function writeToCache(name,val){
    if (settings.pageCache.value == 'true'){
        cache[name] = val;
        logger.log('debug','writing to cache: '+name);
    } else {
        logger.log('debug', 'setting cache disbaled; '+name)
    }
    
}

function serve(req,res){
    logger.log('req',req.url+' '+mimeType[path.extname(req.url)]);
    checkPageCache(req.url, function(c){
        if (c){
            res.writeHead(200, { 'Content-Type': mimeType[path.extname(req.url)]});   
            res.end(c, 'utf-8');
            return;
        } else {
            var parsed = nodeurl.parse(req.url);
            var patharray = parsed.path.split('/');
            var jsondoc;
            if (patharray[1]){
                switch (patharray[1]){
                    case 'auth':
                        logger.log('debug','+++++++++++++++++++++++++++ AUTH DETECTED +++++++++++++++++++++++++++')
                        authcheck(req,res);                             // auth check to check credentials
                        break;
                    case 'lp':
                        jsondoc = '.'+req.url.replace('lp','landingpages')+'.json';
                        forwardPageHandler(jsondoc, req, res);
                        break;
                    case 'resources':
                    case 'jsondocs':
                    case 'drafts':
                    case 'landingpages':
                    case 'api':
                        logger.log('debug','sending to handler '+req.url)
                        handler(req,res);
                        
                        break;
                    default:
                        jsondoc = "./jsondocs"+req.url+'.json';
                        forwardPageHandler(jsondoc, req, res);
                        break;
                }
            } else {
                jsondoc = './jsondocs/index.json';
                forwardPageHandler(jsondoc, req, res);
                return;
            }
        }
    });
}

function compilePageParts(a,res,pview,fourohfour,cacheName){  // compile all the parts of the page and send out

    var returcode;
    fourohfour ? returncode = 404: returncode = 200;

    var page = "";
    complileReadFile('header',a,pview,function(b){     // compileReadFile reads files on disk and 
        page += b;                                              // returns them in a string
        complileCssLink(a,function(b){
            page += b;
            compileTitle(a,function(b){
                page += b;
                compileHeaderTags(a,function(b){
                    page += b;
                    complileReadFile('nav',a,pview,function(b){
                        page += b;
                        compilePageTitle(a,function(b){
                            if (a.hidetitle){
                                page += '';
                            }else{
                                page += b;
                            }
                            getHTML(a,function(b){
                                page +=b;
                                complileReadFile('footer',a,pview,function(b){ 
                                    page += b;
                                    replaceCurlyTags(page, function(ret){
                                        if (!pview){
                                            res.writeHead(returncode, { 'Content-Type': "text/html" });    // after page is complete
                                            res.end(ret, 'utf-8');
                                            writeToCache(cacheName,ret);
                                        } else {
                                            fs.writeFile('./auth/preview.html', ret, function(err){
                                                if (err) {logger.log('debug','error making preview');}
                                            });
                                            res.writeHead(returncode, { 'Content-Type': "text/html" });    // after page is complete
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
            b += "<link rel='stylesheet' data-wato='user-style' type='text/css' href='/resources/CSS/";
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
        if (a.publishDate){
            b += settings.htmlprepubdate.value;
            b += a.publishDate;
            b += settings.htmlpostpubdate.value;
        }
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
function complileReadFile(type, a, pview, cb){
    var str = '';
    var filePath = null;
    switch(type){
        case 'header':
            filePath = './resources/headers/';
            a.header_preview ? str = a.header_preview : str = a.header[0].file;
            break;
        case 'footer':
            filePath = './resources/footers/';
            a.footer_preview ? str = a.footer_preview : str = a.footer[0].file;
            break;
        case 'nav':
            filePath = './resources/nav/';
            a.nav_preview ? str = a.nav_preview : str = settings.navdefault.value;
            break;
    }
        
    logger.log('debug',type+' compiles as string');
    var fileName = filePath + str;
    logger.log('debug','compiler asking for '+fileName);
    fs.exists(fileName, function(ex){
        fs.readFile(fileName, function(err,c){
            if (err){
                logger.log('debug','cant read '+fileName);
            } else {
                var data = c.toString();
                logger.log('debug',data);
                cb(data);
                return;
            }
        });
    });
}
function sendTo404Page(req,res){  // handles compile 404, file 404 is handled elsewhere 
    fs.readFile('./jsondocs/fourohfour.json', function(error, content){
        if (error){
            res.writeHead(404, { 'Content-Type': 'text/plain'});
            res.end("what happened? 404");
        } else {
            //logger.log('debug','page found, starting compiler');
            var json = JSON.parse(content);
            var pview = null;
            var four = true;
            compilePageParts(json, res, pview, four);
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
                    //logger.log('debug',"Decoded Authorization ", plain_auth);
                    var creds = plain_auth.split(':'); 
                    var username = creds[0];
                    var password = creds[1];
                        logger.log('debug',"login attempt: user: "+creds[0]+", pass: "+creds[1]+", ip: "+ip_address);
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
                            res.end('<html><body>Your location is bad, and you should feel bad</body></html>');
                                logger.log('debug',"Bad Location");
                    } else if((username == sessionVar) && (ip_addresspass === true)){ // correct sessionVar, user is using live edit tools;
                            console.log('sessionVar confirmed in authcheck function');
                            handler(req,res);

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
      
      switch(req.url){
    	case '/auth/jsondocs':
		case '/api/filelist':
			dirname = "./jsondocs";
			filetype = ".json";
			returnfiles(dirname, filetype, res);
			break;
		case '/auth/errorpages':
			dirname = './errorpages';
			filetype = '.json';
			returnfiles(dirname, filetype, res);
			break;
		case '/auth/landingpages':
			dirname = './landingpages';
			filetype = '.json';
			returnfiles(dirname, filetype, res);
			break;
		case '/auth/drafts':
			dirname = './drafts';
			filetype = '.json';
			returnfiles(dirname, filetype, res);
			break;
		case '/auth/csslist':
			dirname = "./resources/CSS";
			filetype = ".css";
			returnfiles(dirname, filetype, res);
			break;
		case '/auth/headerlist':
			dirname = "./resources/headers";
			filetype = ".html";
			returnfiles(dirname, filetype, res);
			break;
		case '/auth/footerlist':
			dirname = "./resources/footers";
			filetype = ".html";
			returnfiles(dirname, filetype, res);
			break
		case '/auth/nav':
			dirname = "./resources/nav";
			filetype = ".html";
			returnfiles(dirname, filetype, res);
			break;
		case '/auth/imagelibrary':
			dirname = "./resources/Images";
			filetype = ".jpg";
			returnfiles(dirname, filetype, res);
			break;
		case '/auth/requestslog':
			viewLog('./logs/requests.log', settings.MessageLogLines.value,req,res);
			break;
		case '/auth/debuglog':
			viewLog('./logs/debug.log', settings.MessageLogLines.value,req,res);
			break;
		default: 
			staticFiles(req,res);
			break;
		}

        
    } else {								// req is a POST (api)
		switch (req.url){
			case '/auth/savedata':
				saveData(req,res);
                compileArticlesPage();
                clearCache();
				break;
			case '/auth/deletefile':
				deleteFile(req,res);
				break;
			case '/auth/savehfcssfile':
				saveHfCssFile(req,res);
				break;
			case '/auth/quickpreview':
				quickPreview(req,res);
				break;
			case '/auth/imageloader':
				upload_files(req, res);
				break;
			case '/auth/compileIndex':
				compileIndex(req,res);
				break;
            case '/auth/makeSession':
                makeSession(req,res);
                break;
            case '/api/testSession':
                testSession(req,res);
                break;
			default:
				staticFiles(req,res);
    		break;
		}
	}
}

function staticFiles(req,res){
    var filePath = "."+req.url;
    
    function sendBack(c){
        writeToCache(req.url,c);
        res.writeHead(200, { 'Content-Type': mimeType[path.extname(filePath)] });
        res.end(c);
        return;
    }
    
    function firstThing(){
        checkPageCache(req.url, function(c){
            if (c){
                sendBack(c);
                return;
            } else {
                checkIndex(req, function(redirect_url){
                    filePath = "."+redirect_url;
                    
                    logger.log('debug','fetching '+filePath);
                
                    if (filePath == "./server.js"){  // do not serve up the server source, big no no. 
                        sendTo404Page(req,res);  
                        return;
                    } else {
                        fs.exists(filePath, function(exists) {  // standard file server
                            if (exists) {
                                fs.readFile(filePath, function(error, content) {
                                    if (error) {
                                        sendTo404Page(req,res);
                                        logger.log('debug','there was an error in serving up a file');
                                    }
                                    else {
                                        if (path.extname(filePath) == ".html"){
                                            replaceCurlyTags(content.toString(), function(ret){
                                                logger.log('debug','received response from curly tags')
                                                sendBack(ret);
                                                return;
                                            });
                                        } else {
                                            sendBack(content);
                                            return;
                                        } 
                                    }
                                });
                            } else {
                                sendTo404Page(req,res);   
                            }
                        });
                    }
                });
            }
        });
    }
    firstThing();
}
function checkIndex(req,cb){
    if (indexes[req.url] || indexes[req.url+"/"]){
        var index_redirect = '';
        if (indexes[req.url]) {
            index_redirect = indexes[req.url]
        } else {
            index_redirect = indexes[req.url+"/"]
        }
        logger.log('debug', 'index worked for '+req.url+". rerirecting to "+index_redirect);
        cb(index_redirect);
    } else {
        cb(req.url)
    }
}
function refreshsettings(){
    fs.readFile('./auth/settings.json', function(error, content) {
        if (error) {
            logger.log('debug','refreshsettings: there was an error readding the settings file!!');
        } else {           
            settings = JSON.parse(content);
            logger.log('debug','settings are: '+util.inspect(settings));
        }
    });
}
function constructhtml(a, cb){                                      // when saving an article in the editor, this compiles the html
    if (a.title){                                                   // that will be served up when the page compiles.
        logger.log('debug','construct running on '+a.title);        // this section is specific to how my blog pages are structured
    }else{
        logger.log('debug', 'construct running, a.title null');
    }
    var html = "<article>"; 

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
          d = "<div class='codebox'><header>Code</header><pre class='prettyprint linenums lang-js'><code>";
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
  cb(a);
}  
function returnfiles(d,ft,res,cb){  // returns the list of files requested in the api calls above
    logger.log('debug','file search starting in directory '+d);
        fs.readdir(d, function(err, files){
            if (err){
                logger.log('debug','error in reading directory');
                res.writeHead(200, { 'Content-Type': 'text/event-stream' });
                res.end('There was an error fetching files');
                return;
            } else {
                logger.log('debug','found '+files.length+' files in '+d);
                var text = [];
                for (i=0;i<files.length;i++){
                    if (path.extname(files[i]) == ft){
                        text.push(files[i]);
                    } else {
                        //do nothing!
                    }
                    
                }
                if (res){
                    var message = JSON.stringify(text);
                    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
                    res.end(message);
                    logger.log('debug','files sent');
                    return;
                } else {
                    cb(text);
                }
                
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
    logger.log('debug','removing '+fn);
    fs.exists(fn, function(ex){
        if (ex){
            fs.unlink(fn, function(err){
                if (err){
                    logger.log('activity','Error unlinking file ('+fn+') Error: '+err);
                    cb('error');
                } else {
                    logger.log('activity',fn+' unlinked successfully');
                    cb('success');
                }
            });
        } else {
            cb('exist');
        }
    })
        
}
function forwardPageHandler(path,req,res){
     // checks to see if there is a corresponding artcle
     // in the jsondocs directory
    fs.exists(path, function(ex){
        if (ex){
            fs.readFile(path, function(error, content){
                if (error){
                        //logger.log('debug','not found, redirecting');  // if not then 404
                    sendTo404Page(req,res);
                    } else {
                        //logger.log('debug','page found, starting compiler'); // if yes then compile the page
                    var json = JSON.parse(content),
                        pv = false,
                        four = false;
                    compilePageParts(json,res,pv,four,req.url);
                    return;
                }
            });
        } else {
            sendTo404Page(req,res);
        }
    });
}
function viewLog(fn, linenums, req,res){
    fs.readFile(fn, function (err, content){
        if (err){
            logger.log('debug', 'Error in viewLog()');
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
    var counter = -1;
    var matchCount = 0;
    var matches = [];
    
    function firstThing(content, cb3){
        if (typeof content != "string") {
            content = content.toString();
        }
        var pat = /\{\{([^}]+)\}\}/g
        var m = null;
    
        var p = new RegExp(pat);
        while(m = p.exec(content)){
            matchCount++;
            matches.push(m[0])
            logger.log('debug','found match '+m);
        }
        cb3(matchCount,matches);
    }
        
    function atFile(s,co,cb1){
        var link = s.replace("@", "");
        var co_Ret;
        //logger.log('debug','at symbol worked ++++++ link to include is "'+link+"'");
        //logger.log('debug',s);
        fs.exists(link, function(ex){
            if (ex){
                fs.readFile(link.toString(), function(err, FileData){
                   if (err) {
                       logger.log('debug','error reading include file (replaceCurlyTags)');
                       co_ret = co.replace("{{"+s+"}}",'');
                       return;
                   } else {
                       logger.log('debug','included @ file (replaceCurlyTags) '+link,FileData);
                       co_ret = co.replace("{{"+s+"}}",FileData.toString());
                       cb1(co_ret);
                       return;
                   }
                });
            } else {
                logger.log('debug','link '+link+' does not exist');
                cb1(content);
                return;
            }
        });
    } 
    
    function regularStringReplace(s2,co2,cb2){
        var co2_return;
        if (settings[s2]){
            var MyVar = settings[s2].value;
            co2_return = co2.replace("{{"+s2+"}}", MyVar);
            //logger.log('debug','replaced '+s2+' with '+MyVar);
            cb2(co2_return);
            return;
        } {
            co2_return = co2.replace(s2, s2+' is not defined');
            cb2(co2_return);
            return;
        }
    }
     
    
    function iterate(returnVals){
        content = returnVals;
        counter++;
        if (counter < matchCount){
            curlyInstance = matches[counter].replace('}}','').replace('{{','');
            curlyInstance[0] == '@' ? atFile(curlyInstance,content, iterate) : regularStringReplace(curlyInstance,content, iterate)
        }else{
            logger.log('debug','replaceCurlys done, calling callback');
            cb(content);
        }
    }
    
    firstThing(content, function(var1,var2){
        //logger.log('debug', 'matchCount= '+var1+' matches= '+var2);
        iterate(content);
    });
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
            logger.log('debug', 'error writing '+json.filename+' to file');
        });
    });
}

function saveData(req, res){    // saves the data from the text 
    logger.log('debug','this is a post');                        // editor into json docs
  
    var savedata = '';
    req.on('data', function(chunk) {
        logger.log('debug',"Received body data:");
        savedata += chunk;
    });

    req.on('end', function(){
        var a = JSON.parse(savedata);
        logger.log('debug',util.inspect(a));

        var responseText = {};

        if(a.destination && a.url && a.content){
            constructhtml(a, function(ret){
                var jsonstring = JSON.stringify(ret); 
                var FileName = './'+ret.destination+'/'+ret.url;

                saveDoc(FileName,jsonstring, function(code){
                    if(code == 'success'){
                        responseText.message = 'File saved successfully to '+ret.destination+'.';
                        responseText.code = 200;
                    }else{
                        responseText.message = 'Error saving file to '+ret.destination+'.';
                        responseText.code = 503;
                    }

                    if (a.destination == 'jsondocs' || a.destination == 'drafts'){
                        var switchFolders = {
                            'jsondocs':'drafts',
                            'drafts':'jsondocs'
                        }

                        removeDoc('./'+switchFolders[a.destination]+'/'+a.url, function(code){
                            if (code == 'error') {
                                responseText.message += ' Could move file from '+switchFolders[a.destination]+'.';
                            } else if (code == 'success'){
                                responseText.message += ' Removed file from '+switchFolders[a.destination]+'.'
                            } else if (code == 'exist'){
                                logger.log('debug',a.destination+' does not exist in '+switchFolders[a.destination]+'.')
                            }
                            sendResponse(req,res,responseText.code,responseText.message);
                        });
                    } else {
                        sendResponse(req,res,responseText.code,responseText.message)
                    }
                });  
            });
        } else {
            sendResponse(req,res,503,"Incomplete Data. Cannot Save")
        }
    }); 
}
function sendResponse(req,res,code,responseText){
    var g = JSON.stringify(responseText)

    logger.log('debug',util.inspect(g));

    res.writeHead(code, { 'Content-Type': 'text/event-stream' });
    res.end(responseText);
}
function deleteFile(req,res){ // deletes a json or css file
        req.on('data', function(chunk) {
      
            var a = JSON.parse(chunk);
            logger.log('debug',util.inspect(a));
            
            var path;
            if (a.type && a.file){
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
                       sendResponse(req,res,503,'There was a problem deleting the file'); 
                    } else {
                        logger.log('debug',"Deleted "+path);
                        sendResponse(req,res,200,'Delete Success');
                    }
                });
            } else {
                sendResponse(req,res,503,'Incomplete data. Cannot remove file'); 
            }    
    });
}
function saveHfCssFile(req,res){ // saves a css or header/footer file
        var resetsettings = null;
        var savedata = '';
        req.on('data', function(chunk) {
            savedata += chunk;
        });
        req.on('end', function(){
        var a = JSON.parse(savedata);
        logger.log('debug',util.inspect(a));
        var fileName = null;
        if (a.doctype && a.url && a.content){
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
                    logger.log('debug','error writing to file '+err);
                    sendResponse(rew,res,503,'There was a problem saving');
                } else {
                    logger.log('debug','file written successfully: '+fileName);
                    sendResponse(req,res,200,'file written successfully: '+fileName);
                    if (resetsettings === true){
                        refreshsettings();
                    }
                }
            });
        } else {
            sendResponse(req,res,503,'Incomplete data. Cannot save file');
        }
     });
}
function quickPreview(req,res){
    var savedata = '';
    req.on('data', function(chunk) {
        savedata += chunk;
    });
    req.on('end', function(){
        var a = JSON.parse(savedata);
        if (a.title && a.content){
            constructhtml(a, function(ret){
                var pview = true;
                compilePageParts(ret,res,pview);
            });
        } else {
            sendResponse(req,res,503,'Incomplete Data. Cannot generate preview.');
            return;
        }
    });
} 
function compileArticlesPage(){
    returnfiles("./jsondocs", ".json", false, function(ret){
        logger.log('debug','compileArticlesPage running');
        var counter = 0;
        var html = '<article>';
        var data = [];
        
        (function make(ret){
            
            var doc = ret[counter];
            logger.log('debug','make running on '+doc)
            
            fs.readFile("./jsondocs/"+doc, function(err,c){
                if (err) {logger.log('debug','error reading '+doc+' function compileArticlesPage')
                } else {
                    var contents = JSON.parse(c);
                    if (contents.category == 'dnd'){
                        logger.log('debug','not reading '+contents.title+' as it is '+contents.category);
                        counter++
                        make(ret);
                    } else if (contents.url){
                        logger.log('debug','reading '+contents.title+' as it is '+contents.category);
                        html += '<strong>'+contents.publishDate+'</strong><a href="'+contents.url.replace('.json','')+'">'+contents.title+'</a><br />';
                        html += '<p>'+contents.previewtext;
                        html += '... <a class="readmore" href="'+contents.url.replace('.json','')+'">[ Read More ]</a></p>';
                        data.push({title:contents.title,
                            category:contents.category,
                            publishDate:contents.publishDate,
                            previewtext:contents.previewtext,
                            url:contents.url.replace('.json','')});
                        if (counter < ret.length-1){
                            counter++;
                            make(ret);
                        } else {
                            html += '</article>'
                            logger.log('debug','finished reading '+ret.length+' files. HTML is '+html)
                            fs.readFile("./jsondocs/articles.json", function(err,d){
                                if (err){logger.log('debug','error reading articles, function compileArticlesPage')
                                } else {
                                    dcontents = JSON.parse(d);
                                    dcontents.html = html;
                                    var write = JSON.stringify(dcontents);
                                    fs.writeFile("./jsondocs/articles.json",write, function(err){
                                        if (err){logger.log('debug','error writing to articles.json');
                                        }else {
                                            write = JSON.stringify(data);
                                             fs.writeFile("./jsondocs/allarticlesdata.json",write, function(err){
                                                if (err){logger.log('debug','error writing to allarticlesdata.json')
                                                }else{
                                                    logger.log('debug','finished writing to articles')
                                                    return;
                                                }
                                            });
                                        }
                                    });
                                }
                            })
                        }
                        
                    }
                }
            })
        })(ret);
    })
}
function clearCache(){
    cache = '';
}
function testSession(req,res){
    console.log('testsession')
    logger.log('debug','test session running')
    var key = '';
    var ok = null;

    req.on('data', function(chunk){
        key += chunk;
    });

    req.on('end', function(){
        if (key == sessionVar){
            logger.log('debug', 'The session key does not fit!')
            ok = true
        } else {
            logger.log('debug', 'Session key match, loading live controls');
            ok = false
        }

        if (ok){
            sendResponse(req,res,200,fs.readFileSync("./auth/live_edit.html", 'utf-8',function(err,content){ return content;}));
        } else {
            sendResponse(req,res,403,'key does not fit!')
        }
    });
}
function makeSession(req,res){
    console.log("makesession")
    logger.log('debug', 'make session running')
    var key = '';
    var ok = null;

    req.on('data', function(chunk){
        key += chunk;
    });
    req.on('end', function(){
        logger.log('debug','setting session to '+key)
        sessionVar = key;
        sendResponse(req,res,200,'set session var');
    });
}

app.listen(8080);




































