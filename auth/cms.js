/*  CMS for blog site
    by: Ryan Robinson
    email: ryan.b.robinson@gmail.com
    location: seattle
    license: none (but would love to know its getting used)
*/


// Article Editor functions:


var article = {
    init : function(){
        console.log('initarticle running!')
        console.log(app.config.url);
        article.loadFileList();
        article.loadCssList();
        article.loadHeadersList();
        article.loadFootersList();
        article.register();
        article.loadcontrols();
    },

    register: function(){
            // register all the events when the DOM changes. not sure if this is the best method...
        article.registerPop();
        article.registerDrag();
        article.registerClone();
        article.registerChangeTitle();
        article.registerURL();
    },

    loadFileList:function(){
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", "/auth/filelist", true);
    xmlhttp.send();
    xmlhttp.onreadystatechange = function(){
         if ((xmlhttp.readyState == 4) && (xmlhttp.status == 200)){
            var list = JSON.parse(xmlhttp.responseText);
            var target = document.getElementById("filelist");
            target.innerHTML = "";
            for (i=0;i<list.length;i++){
                var tr = document.createElement("tr");
                var td1 = document.createElement("td");
                var td2 = document.createElement("td");
                var ahref = document.createElement("a");
                var del = document.createElement("button");
                del.setAttribute("type", "button");
                del.setAttribute("class","deletearticle");
                var deltext = document.createTextNode("Delete");
                del.appendChild(deltext);
                ahref.setAttribute("href","javascript:void(0)");
                ahref.setAttribute("class", "fileitem");
                var text = document.createTextNode(list[i]);
                ahref.appendChild(text);
                td1.appendChild(ahref);
                td2.appendChild(del);
                tr.appendChild(td1);
                tr.appendChild(td2);
                target.appendChild(tr);
                }
        }
        else if ((xmlhttp.readyState == 4) && (xmlhttp.status != 200))
        {
            console.log("Error in Connection");
        }
        article.registerFileDelete();
        article.registerGetFile();
    }

},
    // GIVE ME A CALLBACK, IM ASYNCRONOUS!!!!

loadCssList:function(){
    cms_utils.getList("/auth/csslist",function(list){
    var target = document.getElementById("csslist");
    target.innerHTML = "";
    for (i=0;i<list.length;i++){
        var tr = document.createElement("tr");
        var td1 = document.createElement("td");
        var td2 = document.createElement("td");
                
        var inp = document.createElement("input");
        inp.setAttribute("type","checkbox");
        inp.setAttribute("class", "csscheckbox");
                
        var p = document.createElement("span");
        var text = document.createTextNode(list[i]);
        p.appendChild(text);
                
        var lab = document.createElement("label");
        lab.appendChild(inp);
        lab.appendChild(p);
                
                
        td1.appendChild(lab);
        tr.appendChild(td1);
        tr.appendChild(td2);
        target.appendChild(tr);
    }
    });
},
loadHeadersList:function(){
    cms_utils.getList("/auth/headers",function(list){
       var target = document.getElementById("headerlist"); 
       target.innerHTML = "";
        for (i=0;i<list.length;i++){
        var tr = document.createElement("tr");
        var td1 = document.createElement("td");
        var td2 = document.createElement("td");
                
        var inp = document.createElement("input");
        inp.setAttribute("type","checkbox");
        inp.setAttribute("class", "headercheckbox");
                
        var p = document.createElement("span");
        var text = document.createTextNode(list[i]);
        p.appendChild(text);
                
        var lab = document.createElement("label");
        lab.appendChild(inp);
        lab.appendChild(p);
                
        td1.appendChild(lab);
        tr.appendChild(td1);
        tr.appendChild(td2);
        target.appendChild(tr);

        //registerHeadersDelete();
    }
    });
},
loadFootersList:function(){
    cms_utils.getList("/auth/headers",function(list){
       var target = document.getElementById("footerlist"); 
       target.innerHTML = "";
        for (i=0;i<list.length;i++){
        var tr = document.createElement("tr");
        var td1 = document.createElement("td");
        var td2 = document.createElement("td");
                
        var inp = document.createElement("input");
        inp.setAttribute("type","checkbox");
        inp.setAttribute("class", "footercheckbox");
                
        var p = document.createElement("span");
        var text = document.createTextNode(list[i]);
        p.appendChild(text);
                
        var lab = document.createElement("label");
        lab.appendChild(inp);
        lab.appendChild(p);
                 
                
        td1.appendChild(lab);
        tr.appendChild(td1);
        tr.appendChild(td2);
        target.appendChild(tr);

        //registerFootersDelete();
    }
    });
},
registerGetFile:function(){
        // finds the list of documents that can be edited, triggers getFile 
    var filelist = document.getElementsByClassName('fileitem');
    for (var i=0;i<filelist.length;i++){
        var me = filelist[i]
		me.onclick = function(me){
                // dont want to lose your current work!
            var fetchdoc = "/jsondocs/"+me.target.text;
            if (article.loaded === true){
                if (confirm('loading a new file will clear your current work. Did you save?')){
                    article.getFile(fetchdoc);
                }
            }else{
                article.getFile(fetchdoc);
            }
        }
    }
},
getFile:function(doc){
        // fetches the json doc with ajax call, loads the page with textarea elements.

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", doc, true);
    xmlhttp.send();
    xmlhttp.onreadystatechange = function(){
        if ((xmlhttp.readyState == 4) && (xmlhttp.status == 200)){
            var a = JSON.parse(xmlhttp.responseText);
                // clear the article area
            var target = document.getElementById("articledraft");
            target.innerHTML = "";
      
                // load the title
            var titletarget = document.getElementById("titlefield");
            titletarget.value = a.title;
            titletarget.disabled = true;
                        
                // load the url
            var urltarget = document.getElementById("urlfield");
            urltarget.value = a.url;                        
                        
                // load each content section
                //console.log(article.content.length);
            for (i=0;i<a.content.length;i++){
                var e = a.content[i].type;
                var f = a.content[i].text;
                article.createP(e,f);
                //console.log(e+" "+f);
            }
               
                // display latest save date
            var d = new Date(a.savedate);
            d.toString();
            var datetext = document.createTextNode("last saved: "+d);
            var savetarget = document.getElementById('savedate');
            savetarget.innerHTML = "";
            savetarget.appendChild(datetext);
            
                // checks the options checkboxes that apply to this article
           var makeMatch = function(pageElement,JsonData){
                var elem = document.getElementsByClassName(pageElement);
                var b = JsonData;
                for (i=0;i<elem.length;i++){
                    elem[i].checked = false;
                }
                var lookup = {};
                for (var j in b) {
                    lookup[b[j].file] = b[j].file;
                }
                for (var i in elem) {
                    if (isNaN(i)){ // for..in.. iterates over every property including 'length' etc which causes errors
                    }else{   
                        if (typeof lookup[elem[i].nextSibling.innerHTML] != 'undefined') {
                            //console.log('makeMatch found ' + elem[i].nextSibling.innerHTML + ' in both lists');
                            elem[i].checked = true;
                        }
                    } 
                }
            }
            makeMatch("csscheckbox",a.css);
            makeMatch("headercheckbox",a.header);
            makeMatch("footercheckbox",a.footer);
            
                // loads the header tags
            var httarget = document.getElementById('tagsedit');
            if (a.headertags){
            httarget.value = "";
            httarget.value = a.headertags;
            } else {
            httarget.value = "";
            }
            
            article.loaded = true;
            article.register();
        }else{
        }
	}
},

registerChangeTitle:function(){
        // finds the title input and registers click event. changing the title and saving will create a new json doc
    var titletarget = document.getElementById("titlefield");
    titletarget.parentNode.onclick = function(){
        if (article.loaded === true){
            if (confirm('changing the title creates a new article. Proceed?')){
                titletarget.disabled = false;
            }else{
                return;
            }
        }
    }
},
registerURL:function(){
    var field = document.getElementById('titlefield');
    field.onblur = function(){
        var title = field.value;
        title = title.replace(/\s/g, '').toLowerCase();
        title += ".json"
        var target = document.getElementById('urlfield');
        target.value = title;
    }
},
loadcontrols:function(){
        // finds the inputs for creating paragrpghs, headings, etc and registers their click events
	var inputs=document.getElementsByClassName("newitem");
	for (var i=0;i<inputs.length;i++){
		var me = inputs[i]
		me.onclick = function(me){
			forName = me.target.getAttribute('for');
				article.createP(forName);
                article.register();

		};
	}
},
createP:function(e,f){
        // creates a new text section, either paragraph, heading, or preformatted, and 
        // creates some controls on the section.
        // ends by calling the register function
    
		//create new div to hold new item
	var target = document.getElementById("articledraft");
	newdiv = document.createElement("div");
	newdiv.className = "itemholder";
	newdiv.setAttribute('draggable', 'true');

		//create a space for drag and dropping later on
	dropdiv = document.createElement("div");
	spaccer = document.createTextNode("drop-here");
	dropdiv.appendChild(spaccer)
	dropdiv.className = "dropspace";
	dropdiv.setAttribute('ondragover', 'return false')
	dropdiv.setAttribute('ondrop', 'article.dropevent(event)')

		//append the new divs
	target.appendChild(newdiv);


		//change the target to the new div to put the new text area and such
	target = document.getElementsByClassName("itemholder");
	target = target[target.length-1]

		//create the new text area
	txtar=document.createElement("TEXTAREA");
    if(f){
        txtar.value = f;
    }
	txtar.className = "item inline";
	txtar.itemtype = e;
    txtar.setAttribute("cols", "80");
    txtar.setAttribute("rows", "5");

		//create a break
	var br=document.createElement("br");
	
		//create a label, either p, code, or h2
	var para=document.createElement("p");
	para.className = "inline";
	var node=document.createTextNode(e);
	para.appendChild(node);

		//create the button to delete the item
	var del = document.createElement("button");
	var delt=document.createTextNode("Pop");
	del.className = "pop";
	del.appendChild(delt);
	
		//create the button to clone item
	var cln = document.createElement("button");
	var clnt = document.createTextNode("Clone");
	cln.className = "clone"
	cln.appendChild(clnt)

		//append it all to the new target
	target.appendChild(para);
	target.appendChild(txtar);
	target.appendChild(del);
	target.appendChild(cln);
	target.appendChild(br);
	target.appendChild(dropdiv);
},

registerPop:function(){
        // finds all the 'pop' buttons and registers their click events
	var pops = document.getElementsByClassName("pop");
	for (i=0;i<pops.length;i++){
		var me = pops[i];
		me.onclick = function(me){
			oldchild = me.target.parentNode;
			olddropspace = oldchild.nextSibling;
			document.getElementById("articledraft").removeChild(oldchild);
		}
	}
},
dragobject : [],  //  WTF is this?
dragtext : [],
registerDrag:function(){
        // finds all the input sections and prepares to transfer the value in the text area when the element is dragged
	var drags = document.getElementsByClassName("itemholder")
	for (i=0;i<drags.length;i++){
		var me = drags[i];
		me.ondragstart = function(me){
			article.dragobject = me.target;
			article.dragtext = me.target.getElementsByTagName("TEXTAREA")[0].value;
            //console.log(dragobject);
		}	
	}
},
dropevent:function(event){
        // when the dragged element is dropped, thie function clones the element, pops it, and loads the clone. 
    if (event.target.parentNode == article.dragobject){
		return;
	} else {
        //console.log(article.dragobject);
		var newobject = article.dragobject.cloneNode(true);
			newobject.getElementsByTagName("TEXTAREA")[0].value = article.dragtext;
				olddropspace = article.dragobject.nextSibling;
				document.getElementById("articledraft").removeChild(article.dragobject);
		event.target.parentNode.parentNode.insertBefore(newobject, event.target.parentNode.nextSibling);
			//must re-register event handlers!
		article.register();
	}
},
registerClone:function(){
        // finds all the 'clone' buttons and registers their click events. Clones the element when clicked, inserts the 
        // new node after the original node, re-registers events. 
	var clones = document.getElementsByClassName("clone");
		for (i=0;i<clones.length;i++){
			me = clones[i];
			me.onclick = function(me){
			clonevalue = me.target.parentNode.getElementsByTagName("textarea")[0].value;
			var newNode = me.target.parentNode.cloneNode(true);
			newNode.getElementsByTagName("TEXTAREA")[0].value = clonevalue;
			me.target.parentNode.parentNode.insertBefore(newNode, event.target.parentNode.nextSibling);
			register();
			}
		}
},
registerFileDelete:function(){
    var inputs = document.getElementsByClassName("deletearticle");
    for (i=0;i<inputs.length;i++){
        var me = inputs[i];
        me.onclick = function(me){
            var filename = me.target.parentNode.previousSibling.getElementsByTagName("a")[0].text;
            var type = "file";
            article.deletefile(filename,type);
        }
    }
},
deletefile:function(m,t){
    if (confirm("Delete "+m+"?")){
        var xmlhttp = new XMLHttpRequest();
        var json = {"file": m,"type":t};
        var jsonstring = JSON.stringify(json);
        xmlhttp.open("POST", "/auth/deletefile", true);
        xmlhttp.setRequestHeader("Content-Type", "application/json");
        xmlhttp.send(jsonstring);
        xmlhttp.onreadystatechange = function(){
            if ((xmlhttp.readyState == 4) && (xmlhttp.status == 200)){
               if (confirm(xmlhttp.responseText)){
               article.loadFileList();
               article.loadCssList();                   
               }
            } else {
            }
        }
    }
},
	//preview button
preview:function(){
	
	var article = gathertext();
	var target = document.getElementById("preview");
	target.innerHTML = "";
	for (i=0;i<article.length;i++){
		//var ordern = document.createElement('p');
		//var order = document.createTextNode("order: "+e[i].order);
		//ordern.appendChild(order)
		//target.appendChild(ordern);

		pview=document.createElement(article[i].type);
		var para =document.createTextNode(article[i].text)
		pview.appendChild(para)
		//pview.innerHTML(article[i].text);
		

		target.appendChild(pview);

	}
},
gathertext:function(){
	var d = [];
		//finds all the input for the new article and prepares the content section of the json doc for sending to the server
	var items = document.getElementsByClassName("item");
		for (i=0;i<items.length;i++){
            var clean = items[i].value;
                clean = clean.replace(/\</g,"&lt;");
                clean = clean.replace(/\>/g,"&gt;");
			d.push({text:clean,type:items[i].previousSibling.innerHTML,order:i});
		}
	return d;
},
saveabort:null,
gatherthings:function(c){
    var target;
    var prompt;
    if (c == 'css'){target = 'csscheckbox'; prompt = 'css';}
    else if (c == 'hf'){target = 'headercheckbox'; prompt = 'header';}
    else if (c == 'ff'){target = 'footercheckbox'; prompt = 'footer';}
    var d = [];
    var items = document.getElementsByClassName(target);
    for (i=0;i<items.length;i++){
        if (items[i].checked) {
            var filename = items[i].nextSibling.innerHTML;
            d.push({file:filename})
        } else {
        }
    }
    if (d.length == 0){
        alert('you left '+prompt+' blank. You need to select something');
        article.saveabort = true;
    }
    return d;
},
    save:function(){
            // calls the gather() function, fully assembles the json, opens an ajax call, sends json to the server, 
            // displays success or fail
    	var d = new Date();
        if (document.getElementById("titlefield").value.length == 0){
            alert('you left the title blank.');
            console.log('aborted save');
            return;
        }
        var message = {
            url: document.getElementById("urlfield").value,
    		title: document.getElementById("titlefield").value,
    		savedate: d.getTime(),
            content: article.gathertext(),
            css: article.gatherthings('css'),
            header: article.gatherthings('hf'),
            footer: article.gatherthings('ff'),
            headertags: document.getElementById('tagsedit').value
    	}
        if (article.saveabort == true){
            article.saveabort = null;
            console.log('aborted save');
            return;
        } else {
           var xmlhttp = new XMLHttpRequest();
    	   xmlhttp.open("POST", "/auth/savedata", true);
    	   var newarticle = JSON.stringify(message);
    	   xmlhttp.setRequestHeader("Content-Type", "application/json");
    	   xmlhttp.send(newarticle);
        
        	   //console.log('sent ajax call');
                
            xmlhttp.onreadystatechange = function() {        
                if ((xmlhttp.readyState == 4) && (xmlhttp.status == 200)){
                    alert(xmlhttp.responseText);
                    return;
                }
                else if ((xmlhttp.readyState == 4) && (xmlhttp.status != 200))
                {
                    console.log("Error in Connection");
                }
            }
        }
    }
}



//
//
//
//
//
//
//
//
//**********************common to all pages functions*************************
//
//
//
//
//


var cms_utils = {
    getList:function(t,cb){
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("GET", t, true);
        xmlhttp.send();
        xmlhttp.onreadystatechange = function(){
            if ((xmlhttp.readyState == 4) && (xmlhttp.status == 200)){
                var list = JSON.parse(xmlhttp.responseText);
                cb(list);
            }
            else if ((xmlhttp.readyState == 4) && (xmlhttp.status != 200)){
                console.log("Error in Connection. Did not get "+t);
            }
        }  
    },
    hide:function(){
        var body = document.getElementsByTagName("body")[0];
        if (body.className.match(/(?:^|\s)hide(?!\S)/)){
            body.className = body.className.replace( /(?:^|\s)hide(?!\S)/g , '' );
        } else {
            body.className = 'hide';
        }
    }
}
//
//
//
//
//
//
//
//
//
// *********************CSS Editor Functions****************************
//
//
//
//
//
//

var css = {
    init:function(){
            console.log('inithf running!')
        cms_utils.getList("/auth/csslist",function(list){
            var target = document.getElementById("csslist");
            target.innerHTML = "";
            for (i=0;i<list.length;i++){
            var tr = document.createElement("tr");
            var td1 = document.createElement("td");
            var td2 = document.createElement("td");
                    
            var a = document.createElement("a");
            a.setAttribute("href", "javascript:void(0)");
            a.setAttribute("class","cssitem");
            var text = document.createTextNode(list[i]);
            a.appendChild(text);
                    
            var del = document.createElement("button");
            del.setAttribute("type", "button");
            del.setAttribute("class","deletecss");
            var deltext = document.createTextNode("Delete");
            del.appendChild(deltext);
                    
                    
            td1.appendChild(a);
            td2.appendChild(del);
            tr.appendChild(td1);
            tr.appendChild(td2);
            target.appendChild(tr);
    
            css.registerCssItem();
            css.registerFileDelete();
            }
        });
    },
    registerCssItem:function(){
        var items = document.getElementsByClassName("cssitem");
        for(i=0;i<items.length;i++){
            var me = items[i];
            me.onclick = function(me){
                var filename = me.target.text;
                css.loadCssForEdit(filename);
            }
        }
    },
    savecss:function(){
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("POST", "/auth/savehfcssfile", true);
        var fn = {"doctype":"css","content":document.getElementById("editspace").value, "url":document.getElementById('titlefield').value};
        var m = JSON.stringify(fn);
        xmlhttp.setRequestHeader("Content-Type", "application/json");
        xmlhttp.send(m);
        xmlhttp.onreadystatechange = function(){
            if ((xmlhttp.readyState == 4) && (xmlhttp.status == 200)){
                alert(xmlhttp.responseText)
            }else if ((xmlhttp.readyState == 4) && (xmlhttp.status != 200)){
                alert('Error saving that CSS file');
            }
        } 
    },
    loadCssForEdit:function(fn){
        if (css.loaded === true && !confirm("Did you save?")){
                return;
            } else {
                var filename = "/resources/CSS/"+fn;
                var xmlhttp = new XMLHttpRequest();
                xmlhttp.open("GET", filename, true);
                xmlhttp.send();
                xmlhttp.onreadystatechange = function(){
                    if ((xmlhttp.readyState == 4) && (xmlhttp.status == 200)){
                        document.getElementById('editspace').value =xmlhttp.responseText;
                        document.getElementById('titlefield').value = fn;
                        document.getElementById('titlefield').disabled = true;
                        css.loaded = true;
                    }else{
                    }
                }
            }
    },
    newCssDoc:function(){
        if (css.loaded === true && !confirm("Did you save?")){
                return;
            } else {
                document.getElementById('editspace').value = "";
                document.getElementById('titlefield').value = "";
                document.getElementById('titlefield').disabled = false;
            }
    },
    registerFileDelete:function(){
        var inputs = document.getElementsByClassName("deletecss");
        for (i=0;i<inputs.length;i++){
            var me = inputs[i];
            me.onclick = function(me){
                var filename = me.target.parentNode.previousSibling.getElementsByTagName("a")[0].text;
                var type = "css";
                css.deletefile(filename,type);
            }
        }
    },  
    deletefile:function(m,t){
    if (confirm("Delete "+m+"?")){
        var xmlhttp = new XMLHttpRequest();
        var json = {"file": m,"type":t};
        var jsonstring = JSON.stringify(json);
        xmlhttp.open("POST", "/auth/deletefile", true);
        xmlhttp.setRequestHeader("Content-Type", "application/json");
        xmlhttp.send(jsonstring);
        xmlhttp.onreadystatechange = function(){
            if ((xmlhttp.readyState == 4) && (xmlhttp.status == 200)){
               if (confirm(xmlhttp.responseText)){
                  css.init();
               }
            } else {
            }
        }
        }
    }
}

//
//
//
//
//
//
//
//****************Header Footer functions************************
//
//
//
//
//
//
//
var hf = { 
    init:function(){
            console.log('inithf running!')
        cms_utils.getList("/auth/headers",function(list){
            hf.loadHeadFootList(list,"headerlist","headeritem");
        });
        cms_utils.getList("/auth/footers",function(list){
            hf.loadHeadFootList(list,"footerlist","footeritem");
        });
    },
    loadHeadFootList:function(list,t,className){
        var target = document.getElementById(t);
        target.innerHTML = "";
            for (i=0;i<list.length;i++){
            var tr = document.createElement("tr");
            var td1 = document.createElement("td");
            var td2 = document.createElement("td");
                    
            var a = document.createElement("a");
            a.setAttribute("href", "javascript:void(0)");
            a.setAttribute("class","hfitem "+className);
            var text = document.createTextNode(list[i]);
            a.appendChild(text);
                    
            var del = document.createElement("button");
            del.setAttribute("type", "button");
            del.setAttribute("class","deletehfitem");
            var deltext = document.createTextNode("Delete");
            del.appendChild(deltext);
                    
                    
            td1.appendChild(a);
            td2.appendChild(del);
            tr.appendChild(td1);
            tr.appendChild(td2);
            target.appendChild(tr);
    
            hf.registerHfItem();
            }
    },
    registerHfItem:function(){
        var items = document.getElementsByClassName("hfitem");
        for(i=0;i<items.length;i++){
            var me = items[i];
            me.onclick = function(me){
                var filepath = null;
                var filename = me.target.text;
                var parentid = me.target.parentNode.parentNode.parentNode.id;
                if (parentid == "headerlist"){filepath = "/resources/headers/";hf.doctype = "header";}
                if (parentid == "footerlist"){filepath = "/resources/footers/";hf.doctype = "footer";}
                hf.loadHfForEdit(filepath,filename);
            }
        }
    },
    loadHfForEdit:function(fp,fn){
        if (hf.loaded === true && !confirm("Did you save?")){
                return;
            } else {
                var filename = fp+fn;
                var xmlhttp = new XMLHttpRequest();
                xmlhttp.open("GET", filename, true);
                xmlhttp.send();
                xmlhttp.onreadystatechange = function(){
                    if ((xmlhttp.readyState == 4) && (xmlhttp.status == 200)){
                        document.getElementById('editspace').value =xmlhttp.responseText;
                        document.getElementById('titlefield').value = fn;
                        document.getElementById('titlefield').disabled = true;
                        hf.loaded = true;
                        hf.fileName = filename;
                    }else{
                    }
                }
            }
    },
    save:function(){
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("POST", "/auth/savehfcssfile", true);
        var doctype = String(hf.doctype);
        var fn = {"doctype":doctype,"content":document.getElementById("editspace").value, "url":document.getElementById('titlefield').value};
        var m = JSON.stringify(fn);
        xmlhttp.setRequestHeader("Content-Type", "application/json");
        xmlhttp.send(m);
        xmlhttp.onreadystatechange = function(){
            if ((xmlhttp.readyState == 4) && (xmlhttp.status == 200)){
                alert(xmlhttp.responseText)
            }else if ((xmlhttp.readyState == 4) && (xmlhttp.status != 200)){
                alert('Error saving that CSS file');
            }
        } 
    },
}
//
//
//
//
//
//
// ************************nav functions*******************
//
//
//
//
//
var nav = {
    init:function(){
        console.log('nav init running!');
        cms_utils.getList("/auth/nav",function(list){
            var target = document.getElementById("navlist");
            target.innerHTML = "";
            for (i=0;i<list.length;i++){
            var tr = document.createElement("tr");
            var td1 = document.createElement("td");
            var td2 = document.createElement("td");
                    
            var a = document.createElement("a");
            a.setAttribute("href", "javascript:void(0)");
            a.setAttribute("class","navitem");
            var text = document.createTextNode(list[i]);
            a.appendChild(text);
                    
            var del = document.createElement("button");
            del.setAttribute("type", "button");
            del.setAttribute("class","deletenav");
            var deltext = document.createTextNode("Delete");
            del.appendChild(deltext);
                    
                    
            td1.appendChild(a);
            td2.appendChild(del);
            tr.appendChild(td1);
            tr.appendChild(td2);
            target.appendChild(tr);
    
            nav.registerItem();
            }
        });
    },
    registerItem:function(){
         var items = document.getElementsByClassName("navitem");
        for(i=0;i<items.length;i++){
            var me = items[i];
            me.onclick = function(me){
                var filename = me.target.text;
                nav.loadNavForEdit(filename);
            }
        }
    },
    loadNavForEdit:function(fn){
        if (nav.loaded === true && !confirm("Did you save?")){
                return;
            } else {
                var filename = "/resources/nav/"+fn;
                var xmlhttp = new XMLHttpRequest();
                xmlhttp.open("GET", filename, true);
                xmlhttp.send();
                xmlhttp.onreadystatechange = function(){
                    if ((xmlhttp.readyState == 4) && (xmlhttp.status == 200)){
                        document.getElementById('editspace').value =xmlhttp.responseText;
                        document.getElementById('titlefield').value = fn;
                        document.getElementById('titlefield').disabled = true;
                        nav.loaded = true;
                    }else{
                    }
                }
            }
    },
    save:function(){
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("POST", "/auth/savehfcssfile", true);
        var fn = {"doctype":"nav","content":document.getElementById("editspace").value, "url":document.getElementById('titlefield').value};
        var m = JSON.stringify(fn);
        xmlhttp.setRequestHeader("Content-Type", "application/json");
        xmlhttp.send(m);
        xmlhttp.onreadystatechange = function(){
            if ((xmlhttp.readyState == 4) && (xmlhttp.status == 200)){
                alert(xmlhttp.responseText)
            }else if ((xmlhttp.readyState == 4) && (xmlhttp.status != 200)){
                alert('Error saving the nav file');
            }
        } 
    },
    new:function(){
        if (nav.loaded === true && !confirm("Did you save?")){
                return;
            } else {
                document.getElementById('editspace').value = "";
                document.getElementById('titlefield').value = "";
                document.getElementById('titlefield').disabled = false;
            }
    }
}
//
//
//
//
//****************************settings functions***********************
//
//
//
var settings = {
    init:function(){
        var filename = "/settings.js";
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("GET", filename, true);
        xmlhttp.send();
        xmlhttp.onreadystatechange = function(){
            if ((xmlhttp.readyState == 4) && (xmlhttp.status == 200)){
                document.getElementById('editspace').value =xmlhttp.responseText;
                document.getElementById('titlefield').value = filename;
                document.getElementById('titlefield').disabled = true;
                css.loaded = true;
            }else{
            }
        }
    },
    save:function(){
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("POST", "/auth/savehfcssfile", true);
        var fn = {"doctype":"settings","content":document.getElementById("editspace").value, "url":document.getElementById('titlefield').value};
        var m = JSON.stringify(fn);
        xmlhttp.setRequestHeader("Content-Type", "application/json");
        xmlhttp.send(m);
        xmlhttp.onreadystatechange = function(){
            if ((xmlhttp.readyState == 4) && (xmlhttp.status == 200)){
                alert(xmlhttp.responseText)
            }else if ((xmlhttp.readyState == 4) && (xmlhttp.status != 200)){
                alert('Error saving the settings file');
            }
        } 
    }
}