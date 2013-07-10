/*  CMS for blog site
    Bootstrap version
    by: Ryan Robinson
    email: ryan.b.robinson@gmail.com
    location: seattle
    license: none (but would love to know its getting used)
*/


// Article Editor functions:


var article = {
    docInfo: {},
    init : function(){
        article.loadFileList();
        article.loadlist();
        article.register();
        article.loadcontrols();
        //article.registerFileSelect(); not using for bootstrap
        article.registerUploadFile();
        article.registerKeyPress();
        article.registerModalButtons();
        var today = new Date();
        today.setHours( today.getHours()+(today.getTimezoneOffset()/-60) );
        document.querySelector("#publishdate").value = today.toJSON().substring(0,10);
        cms_utils.setSession();
    },

    register: function(){
            // register all the events when the DOM changes. not sure if this is the best method...
        article.registerPop();
        article.registerDrag();
        article.registerClone();
        article.registerChangeTitle();
        article.registerURL();
        article.registerDocChange();
    },

    loadFileList:function(type){
        var api_urls = ["jsondocs","drafts","errorpages","landingpages"];
        var list_targets = ["filelist","draftlist","error_page_list","landing_page_list"];
        var loadFileList_counter = 0;

        var use = function(){

            var url = '/auth/'+api_urls[loadFileList_counter];
            var element = list_targets[loadFileList_counter];
            
            cms_utils.getList(url, function(list){
                var target = document.getElementById(element);
                target.innerHTML = "";
                if (list.length !== 0){
                    for (i=0;i<list.length;i++){
                        var li = document.createElement("li");
                        var ahref = document.createElement("a");
                        ahref.setAttribute("href","javascript:void(0)");
                        ahref.setAttribute("class", "fileitem");
                        ahref.setAttribute("role","menuitem");
                        ahref.setAttribute("tabindex","-1");
                        ahref.dataset.wato_file_type = api_urls[loadFileList_counter];
                        var text = document.createTextNode(list[i]);
                        var icon = document.createElement("i");
                        icon.className = "icon-remove";
                        ahref.appendChild(text);
                        //ahref.appendChild(icon);  puts x icon next to name
                        li.appendChild(ahref);
                        target.appendChild(li);
                    }
                } else {
                    var li = document.createElement("li");
                    li.className = "disabled"
                    var ahref = document.createElement("a");
                    ahref.setAttribute("href","javascript:void(0)");
                    ahref.setAttribute("class", "fileitem");
                    ahref.setAttribute("role","menuitem");
                    ahref.setAttribute("tabindex","-1");
                    var text = document.createTextNode("-none-");
                    var icon = document.createElement("i");
                    icon.className = "icon-remove";
                    ahref.appendChild(text);
                    //ahref.appendChild(icon);  puts x icon next to name
                    li.appendChild(ahref);
                    target.appendChild(li);
                }
            if (loadFileList_counter > 2){
                article.registerFileDelete();
                article.registerGetFile();
                return;
            } else {
                loadFileList_counter++;
                use(); 
            }
            });
        }
        use();
    },
loadlist:function(){
    var listTypes = ["header","footer","css"];
    var counter = 0;

    var use = function(){
        var url = "/auth/"+listTypes[counter]+"list",
        target = listTypes[counter]+"list",
        cls = listTypes[counter]+"checkbox";
    
        cms_utils.getList(url, function(list){
            var t = document.getElementById(target);
            for (q=0;q<list.length;q++) {
            var li = document.createElement("li");

                    
            var inp = document.createElement("input");
            inp.setAttribute("type","checkbox");
            inp.setAttribute("class", cls);
            inp.dataset.wato_file_name = list[q];
                    
            var text = document.createTextNode(list[q]); 
            
            var a = document.createElement("a");  
            a.setAttribute("role","menuitem");
            a.setAttribute("tabindex","-1");
            a.setAttribute("href","javascript:void(0)");

            var lab = document.createElement("label");
            lab.className = 'checkbox';
            lab.appendChild(inp);
            lab.appendChild(text);
            
            a.appendChild(lab);
            li.appendChild(a);
            t.appendChild(li);
            }
        });
        if (counter > 1){
            return;
        } else {
        counter++;
        use(); 
        }
    } 
    use();  
},
registerGetFile:function(){
        // finds the list of documents that can be edited, triggers getFile 
    var filelist = document.getElementsByClassName("fileitem");
    for (var i=0;i<filelist.length;i++){
        var me = filelist[i];
		me.onclick = function(me){
                // dont want to lose your current work!
            var fetchdoc = "/"+me.target.dataset.wato_file_type+"/"+me.target.text;
            if (article.loaded == true && article.docChange == true){
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
            cms_utils.FitToContent(document.getElementsByClassName('item'),100000);
               
                // display latest save date
            var d = new Date(a.savedate);
            d.toLocaleDateString();
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
                        if (typeof lookup[elem[i].dataset.wato_file_name] != 'undefined') {
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

            var displaytarget = document.getElementById('displaycheck');
            a.display ? displaytarget.checked = true : displaytarget.checked = false;

            if (a.destination == 'jsondocs' || a.destination == 'drafts'){
                displaytarget.disabled = false;
            } else {
                displaytarget.disabled = true;
                displaytarget.checked = true;
            }

            var hidetitlecheck = document.getElementById('hidetitlecheck');
            a.hidetitle ? hidetitlecheck.checked = true :  hidetitlecheck.checked = false;
            
            var tags = document.querySelector("#tags");
            a.tags ? tags.value = a.tags.join(" ") : tags.value = null;
            
            var cat = document.querySelector("#category");
            a.category ? cat.value = a.category : category.value = null;
            
            var pview = document.querySelector("#previewtext");
            a.previewtext ? pview.value = a.previewtext : pview.value = null;
            
            var pubdate = document.querySelector("#publishdate");
            a.publishDate ? pubdate.value = a.publishDate : pubdate.value = null;
            
            article.loaded = true;
            article.docChange = false;
            document.querySelector("#navbar_save_button").classList.remove("full_opacity");
            article.docInfo = a;
            article.register();
            article.registerDocChange();
        }else{
        }
	}
},
registerKeyPress:function(){
    window.onkeydown = function(e){
        if (e.ctrlKey && e.keyCode === 83){  // ctrl-s saves
            e.preventDefault();
            article.save();
        } else if (e.ctrlKey && e.keyCode === 68){ // ctrl-d previews
            e.preventDefault();
            article.preview();
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
registerUploadFile:function(){
    var me = document.getElementById("files");
    me.addEventListener('change', article.handleFileSelect, false);
},
createP:function(e,f){
        // creates a new text section, either paragraph, heading, or preformatted,  
        // HTML or Image and creates some controls on the section.
        // ends by calling the register function
        // e is the type of element to be created, paragraph, heading, pre, or HTML
        // f is the value, used when loading a document or cloning a node

        //create new div to hold new item
    var target = document.getElementById("articledraft");
    newdiv = document.createElement("div");
    newdiv.className = "itemholder";
    newdiv.setAttribute('draggable', 'true');
    
            //create a space for drag and dropping later on
    var dropdiv = document.createElement("div");
    var spaccer = document.createTextNode("drop-here");
    dropdiv.appendChild(spaccer)
    dropdiv.className = "dropspace alert";
    dropdiv.setAttribute('ondragover', 'return false')
    dropdiv.setAttribute('ondrop', 'article.dropevent(event)')

            // create cue for user 
    var dragMe = document.createElement("span");
    dragMe.appendChild(document.createTextNode('Draggable'));
    dragMe.className = "dragme";
    
        //append the new divs
    target.appendChild(newdiv);

        //change the target to the new div to put the new text area and such
    target = document.getElementsByClassName("itemholder");
    target = target[target.length-1]

        //create the button to delete the item
    var del = document.createElement("button");
    var delt=document.createTextNode("Pop");
    del.className = "pop btn btn-primary";
    del.appendChild(delt);
    
        //create the button to clone item
    var cln = document.createElement("button");
    var clnt = document.createTextNode("Clone");
    cln.className = "clone btn btn-primary"
    cln.appendChild(clnt)

        //create a break
    var br=document.createElement("br");
    var br2=document.createElement("br");

    if (e !== 'Image'){
            // Paragraphs, preformated, headings, and HTML are handled here

    	   	//create the new text area
        var placeholder;
        switch (e){
            case 'p':
                placeholder = 'Paragraph';
                break;
            case 'h2':
                placeholder = 'Heading';
                break;
            case 'pre':
                placeholder = 'Code';
                break;
            case 'HTML':
                placeholder = 'HTML';
                break;
        }
    	txtar=document.createElement("TEXTAREA");
        if(f){
            txtar.value = f;
        }
        if (e == "HTML" || e == "pre"){
            txtar.className = "span7 center item inline codeedit";
        } else {
            txtar.className = "span7 center item inline";
        }
            
        txtar.itemtype = e;
        txtar.setAttribute("rows", "5");
        txtar.setAttribute("placeholder", placeholder);
        txtar.setAttribute("data-type", e); // custom HTML attribute for storing itemtype

        target.appendChild(txtar);
        target.appendChild(br);
    } else {

            // create library section
        var lib = document.createElement('div');
        lib.className = "imagediv librarydiv";
        var liblabel = document.createElement('p');
        var liblabelt = document.createTextNode('Library: ');
        var button = document.createElement('button');
        button.className = "btn btn-primary libhide control";
        button.setAttribute("onclick", "article.hidelibrary(event);");
        liblabel.appendChild(liblabelt);
        liblabel.appendChild(button);
        lib.appendChild(liblabel);
        var loadspace = document.createElement('div');
        loadspace.setAttribute("id","imagelibrary");
        lib.appendChild(loadspace);
            // create attributes section
        var attributes = document.createElement('div');
        attributes.className = "imagediv attributesdiv";
        var attrlabel = document.createElement('p');
        var attrlabelt = document.createTextNode('HTML');
        attrlabel.appendChild(attrlabelt);
        attributes.appendChild(attrlabel);
        var attr = document.createElement('TEXTAREA');
        attr.setAttribute("rows", "1");
        attr.setAttribute("data-type", 'HTML');
        attr.className = "item codeedit imgattribute span7"
        attributes.appendChild(attr);
        
        target.appendChild(lib);
        target.appendChild(attributes);
    }

    
    target.appendChild(del);
    target.appendChild(cln);
    target.appendChild(dragMe);
    target.appendChild(br2);
    target.appendChild(dropdiv);
    
    if (document.getElementById('imagelibrary')){
        article.loadImageLibrary();
    }
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
    var dropZones = document.getElementsByClassName('dropspace');
	var drags = document.getElementsByClassName("itemholder")
	for (i=0;i<drags.length;i++){
		var me = drags[i];
		me.addEventListener("dragstart", function(me){
			article.dragobject = me.target;
			article.dragtext = me.target.getElementsByTagName("TEXTAREA")[0].value;
            for(i=0;i<dropZones.length;i++){
                dropZones[i].classList.add('full_opacity');
            }
            //console.log(dragobject);
		});
        me.addEventListener("dragend", function(){
            for(i=0;i<dropZones.length;i++){
                dropZones[i].classList.remove('full_opacity');
            }
        });
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
			article.register();
			}
		}
},
registerFileDelete:function(){
    var inputs = document.getElementsByClassName("deletearticle");
    for (i=0;i<inputs.length;i++){
        var me = inputs[i];
        me.onclick = function(me){
            var filename = me.target.parentNode.previousSibling.getElementsByTagName("a")[0].text;
            var type = document.getElementById('fileselect').value;
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
               article.loadFileList(document.getElementById('fileselect').value);
               article.loadCssList();                   
               }
            } else {
            }
        }
    }
},
registerDocChange:function(){
    //var save_button = document.querySelector("#navbar_save_button");
    //var docItems = [];
    //var textareas = document.getElementsByTagName('textarea');
    //var inputs = document.getElementsByTagName('input');
    //loadDocItems(textareas);
    //loadDocItems(inputs);
    //function loadDocItems(inp){
    //    for (i=0;i<inp.length;i++){
    //        docItems.push(inp[i]);
    //    }
    //}
    //for (i=0;i<docItems.length;i++){
    //    docItems[i].onclick = function(){
    //        article.docChange = true;
    //        if (save_button.classList.contains('full_opacity') == false){
    //            save_button.classList.add('full_opacity');
    //        }
    //        console.log('changed');
    //    }
    //}
},
gathertext:function(){
	var d = [];
		//finds all the input for the new article and prepares the content section of the json doc for sending to the server
	var items = document.getElementsByClassName("item");
		for (i=0;i<items.length;i++){
			d.push({text:items[i].value,type:items[i].dataset.type,order:i});
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
            var filename = items[i].dataset.wato_file_name;
            d.push({file:filename})
        } else {
        }
    }
    if (d.length == 0){
        cms_utils.sendAlert('warn','you left '+prompt+' blank. You need to select something');
        article.saveabort = true;
    }
    return d;
},
    save:function(){
            // calls the gather() function, fully assembles the json, opens an ajax call, sends json to the server, 
            // displays success or fail
    	var d = new Date();
        if (document.getElementById("titlefield").value.length == 0){
            cms_utils.sendAlert('warn','you left the title blank.');
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
            headertags: document.getElementById('tagsedit').value,
            tags: document.querySelector("#tags").value.split(" "),
            category:document.getElementById("category").value,
            previewtext: document.querySelector("#previewtext").value,
            publishDate: document.querySelector("#publishdate").value
    	}
        
        var displaycheck = document.getElementById('displaycheck');
        displaycheck.checked ? message.display = true : message.display = false;

        var hidetitlecheck = document.getElementById('hidetitlecheck');
        hidetitlecheck.checked ? message.hidetitle = true : message.hidetitle = false;
        
        if (article.saveabort === true){
            article.saveabort = null;
            console.log('aborted save');
            return;
        } else {
            if (article.determineDestination()){
                message.destination = article.determineDestination();
                console.log(article.determineDestination());
            } else {
                console.log('threw modal window');
                $('#save_modal').modal('show');
                return;
            }

           var xmlhttp = new XMLHttpRequest();
    	   xmlhttp.open("POST", "/auth/savedata", true);
    	   var newarticle = JSON.stringify(message);
    	   xmlhttp.setRequestHeader("Content-Type", "application/json");
    	   xmlhttp.send(newarticle);
        
        	   console.log('sent ajax call');
                
            xmlhttp.onreadystatechange = function() {        
                if ((xmlhttp.readyState == 4) && (xmlhttp.status == 200)){
                    var res = JSON.parse(xmlhttp.responseText);
                    cms_utils.sendAlert(res.code,res.message);
                    if (res.code = 'ok'){
                        article.docChange = false;
                        document.querySelector("#navbar_save_button").classList.remove("full_opacity");
                    }
                    return;
                }
                else if ((xmlhttp.readyState == 4) && (xmlhttp.status != 200))
                {
                    cms_utils.sendAlert('bad',"Error in Connection");
                }
            }
        }
    },
        //preview button
    preview:function(){
       if (document.getElementById("titlefield").value.length == 0){
            cms_utils.sendAlert('warn','you left the title blank.');
            console.log('aborted save');
            return;
        }
        var message = {
            url: document.getElementById("urlfield").value,
            title: document.getElementById("titlefield").value,
            content: article.gathertext(),
            css: article.gatherthings('css'),
            header: article.gatherthings('hf'),
            footer: article.gatherthings('ff'),
            headertags: document.getElementById('tagsedit').value,
            destination: article.docInfo.destination,
            tags: document.querySelector("#tags").value.split(" "),
            category:document.getElementById("category").value,
            previewtext: document.querySelector("#previewtext").value,
            publishDate: document.querySelector("#publishdate").value
        }
        
        var hidetitlecheck = document.getElementById('hidetitlecheck');
        hidetitlecheck.checked ? message.hidetitle = true : message.hidetitle = false;

        if (article.saveabort === true){
            article.saveabort = null;
            console.log('aborted preview');
            return;
        } else {
           var xmlhttp = new XMLHttpRequest();
           xmlhttp.open("POST", "/auth/quickpreview", true);
           var newarticle = JSON.stringify(message);
           xmlhttp.setRequestHeader("Content-Type", "application/json");
           xmlhttp.send(newarticle);
        
               //console.log('sent ajax call');
                
            xmlhttp.onreadystatechange = function() {        
                if ((xmlhttp.readyState == 4) && (xmlhttp.status == 200)){
                    window.open('/auth/preview.html');

                    return;
                }
                else if ((xmlhttp.readyState == 4) && (xmlhttp.status != 200))
                {
                    cms_utils.sendAlert('bad',"Error in Connection");
                }
            }
        }
    },
    exportFile:function(){
        var d = new Date();
        if (document.getElementById("titlefield").value.length == 0){
            cms_utils.sendAlert('warn','you left the title blank.');
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
            headertags: document.getElementById('tagsedit').value,
            destination: article.docInfo.destination,
            tags: document.querySelector("#tags").value.split(" "),
            category:document.getElementById("category").value,
            previewtext: document.querySelector("#previewtext").value,
            publishDate: document.querySelector("#publishdate").value
        }
        
        var displaycheck = document.getElementById('displaycheck');
        displaycheck.checked ? message.display = true : message.display = false;

        var hidetitlecheck = document.getElementById('hidetitlecheck');
        hidetitlecheck.checked ? message.hidetitle = true : message.hidetitle = false;

        if (article.saveabort === true){
            article.saveabort = null;
            console.log('aborted save');
            return;
        } else {
            var toExport = JSON.stringify(message);
            window.open('data:text/plain,'+toExport);
        }
    },
    newDoc:function(){
        if (article.loaded === true && article.docChange === true && !confirm('loading a new file will clear your current work. Did you save?')){
                return;
        } else {
            var inputs = document.getElementsByTagName('input');
            for(i=0;i<inputs.length;i++){
                inputs[i].checked = false;
                inputs[i].value = '';
            }
            var textareas = document.getElementsByTagName('textarea');
            for(i=0;i<textareas.length;i++){
                textareas[i].value = '';
            }
            document.getElementById('articledraft').innerHTML = '';
            document.getElementById('titlefield').disabled = false;;
            document.getElementById('urlfield').disabled = false;;
            var save = document.getElementById('savedate').innerHTML = '';

            article.docInfo = {};
            article.loaded = false;
            article.docChange = false;
        }
    },
    handleFileSelect:function(me){
            // reads image file to send via AJAX and generate preview
        var files = me.target.files; // FileList object

            // Loop through the FileList and render image files as thumbnails.
        for (var i = 0, f; f = files[i]; i++) {

            // Only process image files.
        if (!f.type.match('image.*')) {
            continue;
        }

        var reader = new FileReader();

            // Closure to capture the file information.
        reader.onload = (function(theFile) {
            return function(e) {
                // Render thumbnail.
            var span = document.createElement('span');
            span.innerHTML = ['<img class="thumb" src="', e.target.result,
                            '" title="', escape(theFile.name), '"/>'].join('');
            document.getElementById('list').insertBefore(span, null);
            article.sendFile(theFile, e.target.result)
            };
        })(f);

            // Read in the image file as a data URL.
        reader.readAsDataURL(f);
        }
    },
    sendFile:function(f, res){
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("POST", "/auth/imageloader", true);
        xmlhttp.overrideMimeType('text/plain; charset=x-user-defined-binary');
        var data = {
            "filename": f.name,
            "data":res
        }
        var strng = JSON.stringify(data)
        xmlhttp.send(strng);       
    },
    loadImageLibrary:function(){
            // loads thumbnail images with click events to load
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("GET", '/auth/imagelibrary', true);
        xmlhttp.send();
        xmlhttp.onreadystatechange = function(){
            if ((xmlhttp.readyState == 4) && (xmlhttp.status == 200)){
                var list = JSON.parse(xmlhttp.responseText);
                
                var imageblock = '';
                
                for (i=0; i<list.length; i++){
                    imageblock += '<img src="/resources/Images/'+list[i]+'" class="thumb" onclick="article.loadIndivPic(event)" />';
                }
                var target = document.getElementById('imagelibrary');
                target.innerHTML = imageblock;
            }
        }
    },
    loadIndivPic:function(event){
            // adds the clicked image's src property into an HTML
        var src= event.target.getAttribute("src");
        var newImgTag = '<img src="'+src+'"/>';
        
        var target = event.target.parentNode.parentNode.parentNode.getElementsByClassName('imgattribute')[0];
        target.value = '';
        target.value = newImgTag;
    },
    hidelibrary:function(event){
            // toggles isibility of the thumbnail library
        target = event.target.parentNode.parentNode;
        
       cms_utils.HTML5toggleClass(target, "librarydivhide");
    },
    determineDestination:function(){
        var dc = document.getElementById('displaycheck');
        if(article.docInfo && article.docInfo.destination){ 
            var d = article.docInfo.destination;
            if (d == 'jsondocs' || d == 'drafts'){
                var k;
                dc.checked ? k = 'jsondocs' : k = 'drafts';
                return k;
            } else {
                return d;
            }
        } else {
            return false;
        }
    },
    registerModalButtons:function(){
        var save = document.querySelector("#save_modal_save_button");
        var cancel = document.querySelector("#save_modal_cancel");
        var selector = document.querySelector("#save_modal_selector");
        var dc = document.getElementById('displaycheck');

        save.addEventListener("click",function(){
            article.docInfo.destination = selector.value;
            selector.value == 'drafts' ?  dc.checked = false : dc.checked = true;
            dc.disabled = false;
            $('#save_modal').modal('hide');
            article.save();
        });

        cancel.addEventListener("click",function(){
            $('#save_modal').modal('hide');
        })
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
    ajaxFunction:function(){
        var xmlhttp; 
        try { xmlhttp = new XMLHttpRequest();}
        catch (e) {
            try { xmlhttp = new ActiveXObject("Msxml2.XMLHTTP"); }
            catch (e) {
                try { xmlhttp = new ActiveXObject("Microsoft.XMLHTTP"); }
                catch (e) { console.log('no ajax?'); return false; }
            }
        }
        return xmlhttp;
    },
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
                cms_utils.sendAlert('bad',"Error in Connection. Did not get "+t);
            }
        }  
    },
    hide:function(){
        var body = document.getElementsByTagName("body")[0];
        body.classList.toggle("hide");
    },
    HTML5toggleClass:function(element,classname){
            element.classList.toggle(classname);
    },
    FitToContent:function(inp, maxHeight){
        for(i=0;i<inp.length;i++){    
            var text = inp[i] && inp[i].style ? inp[i] : document.getElementById(inp[i]);
            if ( !text )
                return;
    
                /* Accounts for rows being deleted, pixel value may need adjusting */
                if (text.clientHeight == text.scrollHeight) {
                    text.style.height = "30px";
                }       
    
                var adjustedHeight = text.clientHeight;
                if ( !maxHeight || maxHeight > adjustedHeight )
                {
                    adjustedHeight = Math.max(text.scrollHeight, adjustedHeight);
                    if ( maxHeight )
                        adjustedHeight = Math.min(maxHeight, adjustedHeight);
                    if ( adjustedHeight > text.clientHeight )
                        text.style.height = adjustedHeight + "px";
            }
        }
    },
    compileIndex:function(){
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("POST", "/auth/compileIndex", true);
        xmlhttp.send();
        xmlhttp.onreadystatechange = function(){
            if ((xmlhttp.readyState == 4) && (xmlhttp.status == 200)){
                var ret = JSON.parse(xmlhttp.responseText);
                var target = document.getElementById('indexspace');

                for (i=0;i<ret.length;i++){
                    var path = document.createTextNode(ret[i].path);
                    var a = ret[i].content;
                    var spill = '';

                    for (l in a){
                        spill += String(l)+":";
                        spill += String(a[l]);
                        spill += "\n"

                    }
                    var cont = document.createTextNode(spill);

                    var box = document.createElement('div');
                    box.setAttribute("class", "indexbox");

                    var pathslot = document.createElement("div");
                    pathslot.setAttribute('class','indexpath');
                    pathslot.appendChild(path);
                    box.appendChild(pathslot);

                    var contslot = document.createElement("div");
                    contslot.setAttribute('class', "indexcont");
                    contslot.appendChild(cont);
                    box.appendChild(contslot);

                    target.appendChild(box);
                }
            }
            else if ((xmlhttp.readyState == 4) && (xmlhttp.status != 200)){
                console.log("Error in Connection. could not search");
            }
        }  
    },
    searchIndex:function(){
        var query = document.getElementById('indexsearchquery').value;
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("POST", "/auth/searchIndex", true);
        xmlhttp.send(query);
        xmlhttp.onreadystatechange = function(){
            if ((xmlhttp.readyState == 4) && (xmlhttp.status == 200)){
                var ret = JSON.parse(xmlhttp.responseText);
                console.log(ret)
            }
            else if ((xmlhttp.readyState == 4) && (xmlhttp.status != 200)){
                console.log("Error in Connection. could not search");
            }
        }  
    },
    setSession:function(){
        console.log("running storage key function");
        var key;
        if (localStorage){
            if (localStorage.WATOKEY){
                console.log('wato key in place '+localStorage.WATOKEY);
                key = localStorage.WATOKEY;
            } else {
                var item = "WATOKEY",
                key = Math.floor(Math.random()*1000000001);
                localStorage.setItem(item,key);
                console.log("setting key "+item,key);
            }

            var xmlhttp = cms_utils.ajaxFunction();
            xmlhttp.open("POST", "/auth/makeSession", true);
            xmlhttp.send(key);
            xmlhttp.onreadystatechange = function(){
                if ((xmlhttp.readyState == 4) && (xmlhttp.status == 200)){
                    console.log(xmlhttp.responseText);
                    console.log(xmlhttp.getAllResponseHeaders().toLowerCase());
                }
            }
        }
    },
    sendAlert:function(level,message){
        var classlevels = {
            'ok': 'span7 alert alert-success',
            'warn': 'span7 alert',
            'bad':'span7 alert alert-error'
        } 
        var messagetype = {
            'ok': 'Success!',
            'warn': 'Warning!',
            'bad':'Uh-oh'
        }
        var target = document.querySelector("#alertsdiv");
        var div = document.createElement("div");
        var button = '<button type="button" class="close" data-dismiss="alert">&times;</button>'
        div.innerHTML = button;
        var strong = document.createElement("strong");
        strong.appendChild(document.createTextNode(messagetype[level]));
        div.appendChild(strong);
        div.appendChild(document.createTextNode(" "+message));
        div.className = classlevels[level];

        target.appendChild(div);
    },
    show_log:function(log){
        var ut = {
            'debug':{'url':'debuglog','heading':'Debug Log'},
            'request':{'url':'requestslog','heading':'Requests Log'},
        }
        //console.log(ut[log]['url']);
        //console.log(ut[log].url);
        var xmlhttp = cms_utils.ajaxFunction();
        xmlhttp.open("GET", "/auth/"+ut[log].url, true);
        console.log('about to send')
        xmlhttp.send();
        console.log('sent')
        xmlhttp.onreadystatechange = function(){
            if ((xmlhttp.readyState == 4) && (xmlhttp.status == 200)){
                console.log('got response');
                document.querySelector("#debug_text").innerHTML = xmlhttp.responseText.replace(/\n/g, '<br />');
                document.querySelector("#debug_heading").innerHTML = ut[log].heading;
                $("#debug_modal").modal("show");
            } else if ((xmlhttp.readyState == 4) && (xmlhttp.status == !200)){
                console.log('error')
            } else {
                console.log('something else happened',xmlhttp.readyState,xmlhttp.status)
            }
        }
        console.log('downhere now')
        $("#debug_close").click(function(){
            $("#debug_modal").modal("hide");
        })
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
                alert(xmlhttp.responseText);
            }
        } 
    },
    loadCssForEdit:function(fn){
        if (css.loaded === true && !confirm("Did you save?")){
                return;
            } else {
                var editor = ace.edit("live_edit_ace_editor");
                var filename = "/resources/CSS/"+fn;
                var xmlhttp = new XMLHttpRequest();
                xmlhttp.open("GET", filename, true);
                xmlhttp.send();
                xmlhttp.onreadystatechange = function(){
                    if ((xmlhttp.readyState == 4) && (xmlhttp.status == 200)){
                        editor.setTheme("ace/theme/monokai");
                        editor.getSession().setMode("ace/mode/css");
                        editor.setValue(xmlhttp.responseText);
                        document.getElementById('titlefield').value = fn;
                        document.getElementById('titlefield').disabled = true;
                        css.loaded = true;
                        cms_utils.FitToContent(document.getElementsByClassName('codeedit'),2000000);
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
        cms_utils.getList("/auth/headerlist",function(list){
            hf.loadHeadFootList(list,"headerlist","headeritem");
        });
        cms_utils.getList("/auth/footerlist",function(list){
            hf.loadHeadFootList(list,"footerlist","footeritem");
        });
    },
    loadHeadFootList:function(list,t,className){
        var target = document.getElementById(t);
        target.innerHTML = "";
        console.log(list);
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
    
            }
        hf.registerHfItem();
        hf.registerDocTypeRadios();
    },
    registerHfItem:function(){
        var items = document.getElementsByClassName("hfitem");
        for(i=0;i<items.length;i++){
            var me = items[i];
            me.onclick = function(me){
                var filepath = null;
                var filename = me.target.text;
                var parentid = me.target.parentNode.parentNode.parentNode.id;
                if (parentid == "headerlist"){
                    filepath = "/resources/headers/";hf.doctype = "header";
                } else if (parentid == "footerlist"){
                    filepath = "/resources/footers/";hf.doctype = "footer";
                } else {
                    console.log('Error determining doctype');
                }
                hf.loadHfForEdit(filepath,filename);
            }
        }
    },
    registerDocTypeRadios:function(){
        var radios = document.getElementsByClassName("doctyperadio");
        for (i=0;i<radios.length;i++){
            var me = radios[i];
            me.onclick = function(me){
                hf.doctype = me.target.value;
                console.log(hf.doctype);
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
                        var radios = document.getElementsByClassName("doctyperadio");
                        for (i=0;i<radios.length;i++){
                            if (radios[i].value == hf.doctype){
                                radios[i].checked = true;
                            }
                        }
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
        var filename = "/auth/settings.json";
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("GET", filename, true);
        xmlhttp.send();
        xmlhttp.onreadystatechange = function(){
            if ((xmlhttp.readyState == 4) && (xmlhttp.status == 200)){
                var a = JSON.parse(xmlhttp.responseText);
                var target = document.getElementById('editspace');
                
                for (var n in a){
                    settings.addSetting(n, a[n].value, a[n].desc)
                }
                settings.loaded = true;
                settings.registerDelete();
            }else{
            }
        }
    },
    save:function(){
        var target = document.getElementById('editspace');
        var rows = target.getElementsByTagName('tr');
        var contents = {};
        for (i=0;i<rows.length;i++){
            var cells = rows[i].getElementsByTagName('td');
            var namecell;
            var desccell;
            
            cells[0].firstElementChild ? namecell = cells[0].firstChild.value :  namecell = cells[0].innerHTML;
            
            cells[3].firstElementChild ? desccell = cells[3].firstChild.value :  desccell = cells[3].innerHTML;

            var fieldcell = cells[1].firstChild.value;
            contents[namecell] = {
                "value":fieldcell,
                "desc":desccell
            }
        }
        contents = JSON.stringify(contents);

        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("POST", "/auth/savehfcssfile", true);     
        var fn = {"doctype":"settings","content":contents, "url":"settings.json"};
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
    },
    addSetting:function(sN, sV, sD){  // settingName, sattingValue, settingDescription
        var target = document.getElementById('editspace');
        var td1 = document.createElement('td');
        var td2 = document.createElement('td');
        var td3 = document.createElement('td');
        var td4 = document.createElement('td');
        var tr = document.createElement('tr');
        
        var del = document.createElement('button');
        del.setAttribute("type", "button");
        del.setAttribute("class", "deletesetting");
        var deltxt = document.createTextNode('Delete');
        del.appendChild(deltxt);
        
        if (sN){
            var sname = document.createTextNode(sN); 
        } else {
            var sname = document.createElement('input');
            sname.setAttribute("type","text");
        }
        
        var sfield = document.createElement('input');
        sfield.setAttribute("type","text");
        if (sV){
            sfield.setAttribute("value", sV);
        }
        
        if (sD){
            var sDesc = document.createTextNode(sD); 
        } else {
            var sDesc = document.createElement('input');
            sDesc.setAttribute("type","text");
        }
              
        td1.appendChild(sname);
        td2.appendChild(sfield);
        td3.appendChild(del);
        td4.appendChild(sDesc);
        tr.appendChild(td1);
        tr.appendChild(td2);
        tr.appendChild(td3);
        tr.appendChild(td4);
        target.appendChild(tr);
        settings.registerDelete();
    },
    registerDelete:function(){
        var inputs = document.getElementsByClassName('deletesetting');
        for (i=0;i<inputs.length;i++){
            var me = inputs[i];
            me.onclick = function(me){
                var target = me.target.parentNode.parentNode;
                document.getElementById('editspace').removeChild(target);
            }
        }
    }
}
window.onbeforeunload =  function(){
    if (localStorage){
        localStorage.clear();
    }
}
var wato_index = {
    loadfiles:function(){
        article.loadFileList();
    }
}
    _.extend(article, Backbone.Events);

    article.on("inputclick", function(msg){
        if (!$("#navbar_save_button").hasClass('full_opacity')){
            $("#navbar_save_button").addClass('full_opacity')
        } else {
            return;
        }
    });

    article.trigger("alert", "an event");

    var inputs = document.getElementsByTagName('input');
    var textareas = document.getElementsByTagName('textarea');
    var buttons = document.getElementsByTagName('button');

    var typeinputs = [];
    var buttoninputs = [];
    function loadUp(listType,arraay){
        for (var i = 0; i < arraay.length; i++) {
            listType.push(arraay[i])
        };
    }

    loadUp(typeinputs,inputs);
    loadUp(typeinputs,textareas);

    for (i=0;i<typeinputs.length;i++){
        typeinputs[i].addEventListener("keydown", function(me){
            article.trigger("inputclick", me.target.id);
        });
    }

    var eventsMatrix = {
        'titlefield':'doc:change',
        'urlfield':'doc:change',
        'tags':'doc:change',
        'category':'doc:change',
        ''
    }

