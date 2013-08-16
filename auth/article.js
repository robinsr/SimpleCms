/*
 *  article.js 
 *  Ryan Robinson
 *  ryan.b.robinson@gmail.com
 *
 */


 // object representing a file; used for makeing dropdowns
 function file(title,type,selected){
 	this.title = title;
 	this.type = type;
 	this.selected = ko.observable(selected);
 }

 // object for category or tag 
 function catTag(name){
 	this.name = name;
 }

 // object for piece of content
 function contentBlock(type,order,text){
 	var self = this;
 	this.type = type ? ko.observable(type) : ko.observable('p');
 	this.order = order ? ko.observable(order) : ko.computed(function(){
 		return wato.viewmodel.article.content().length;
 	})
 	this.text = text ? ko.observable(text) : ko.observable();
 }

 function AppViewModel(){
 	var self = this;

 	self.article = {
 		title : ko.observable('New Article'),
 		url : ko.observable(),
 		publishDate : ko.observable(new Date()),
 		content : ko.observableArray([]),
 		tags : ko.observableArray([]),
 		categories : ko.observableArray([]),
 		hideTitle : ko.observable(false),
 		previewtext : ko.observable(),
 		headerTags : ko.observable(),
 		selectedDestination : ko.observable(),
 		css : ko.observableArray(),
 		header : ko.observableArray(),
 		footer : ko.observableArray(),

	 	// write access specifies basic permissions

	 	writeAccess : ko.observable(0)
	 }

	// =================================
	// MenuLists - arrays holding file names; used in dropdowns
	// and controls for the dropdowns

	self.liveArticles = ko.observableArray();
	self.drafts = ko.observableArray();
	self.landingPages = ko.observableArray();
	self.errorPages = ko.observableArray();
	self.cssFiles = ko.observableArray();
	self.headerFiles = ko.observableArray();
	self.footerFiles = ko.observableArray();

	self.getFile = function(me){
		console.log(me);
		utils.issue('/'+me.type+'/'+me.title,null,function(err,stat,text){
			if (err){

			} else if (stat != 200){

			} else {
				var parsed = JSON.parse(text)

				self.article.title(parsed.title)
				self.article.url(parsed.url)
				self.article.publishDate(parsed.publishDate)

				self.article.content.removeAll();
				$(parsed.content).each(function(){
					self.article.content.push(new contentBlock(this.type,this.order,this.text))
				})

				self.article.tags.removeAll();
				if ($.isArray(parsed.tags)){
					$(parsed.tags).each(function(index,value){self.article.tags.push(new catTag(value))})
				} else {
					$(parsed.tags).each(function(){
						self.article.tags.push(new catTag(this.name))
					})
				}

				self.article.categories.removeAll();
				if (parsed.categories && $.isArray(parsed.categories)) {
					$(parsed.categories).each(function(index,value){self.article.categories.push(new catTag(value))})
				} else if (parsed.categories) {
					$(parsed.categories).each(function(){
						self.article.categories.push(new catTag(this.name))
					})
				} else if (parsed.category) {
					self.article.categories.push(new catTag(parsed.category))
				}

				self.article.hideTitle(parsed.hideTitle)
				self.article.previewtext(parsed.previewtext)
				self.article.headerTags(parsed.headerTags)
				self.article.selectedDestination(parsed.selectedDestination)

				ko.utils.arrayForEach(self.cssFiles(), function(file) {
					file.selected(false) 
					$(parsed.css).each(function(){
						if (this.file == file.title){
							file.selected(true)
						}
					})
				});
				ko.utils.arrayForEach(self.headerFiles(), function(file) {
					file.selected(false) 
					$(parsed.header).each(function(){
						if (this.file == file.title){
							file.selected(true)
						}
					})
				});
				ko.utils.arrayForEach(self.footerFiles(), function(file) {
					file.selected(false) 
					$(parsed.footer).each(function(){
						if (this.file == file.title){
							file.selected(true)
						}
					})
				});
			}
		})
	}

	// =================================
	// Controls for the menu lists - finds selected files and adds to article model

	self.findCss = function(){
		self.article.css.removeAll();
		ko.utils.arrayForEach(self.cssFiles(), function (file) {
			if (file.selected() == true) {
				self.article.css.push({file:file.title})
			}
		})
	}
	self.findHeaders = function(){
		self.article.header.removeAll();
		ko.utils.arrayForEach(self.headerFiles(), function (file) {
			if (file.selected() == true) {
				self.article.header.push({file:file.title})
			}
		})
	}
	self.findFooters = function(){
		self.article.footer.removeAll();
		ko.utils.arrayForEach(self.footerFiles(), function (file) {
			if (file.selected() == true) {
				self.article.footer.push({file:file.title})
			}
		})
	}

	// =================================
	// UI controls - respond to user clicks and such

	self.newTag = ko.observable();
	self.deleteTag = function(element){
		self.article.tags.remove(element);
		console.log(element);
	}
	self.addTag = function(){
		self.article.tags.push(new catTag(self.newTag()))
		self.newTag('');
	}

	self.newCat = ko.observable();
	self.deleteCat = function(element){
		self.article.categories.remove(element);
	}
	self.addCat = function(){
		self.article.categories.push(new catTag(self.newCat()))
		self.newCat('');
	}

	self.newParagraph = function(){
		self.article.content.push(new contentBlock('p',null,null))
	}
	self.newCode = function(){
		self.article.content.push(new contentBlock('pre',null,null))
	}
	self.newHeading = function(){
		self.article.content.push(new contentBlock('h2',null,null))
	}
	self.newHtml = function(){
		self.article.content.push(new contentBlock('HTML',null,null))
	}
	self.newPicture = function(){

	}
	self.pop = function(me){
		self.article.content.splice(self.article.content.indexOf(me),1)
	}
	self.clone = function(me){
		self.article.content.splice(self.article.content.indexOf(me),0,me)
	}

	// =================================
	// document options

	self.newDocument = function(){}
	self.exportFile = function(){}
	self.preview = function(){}
	self.save = function(){
		self.findCss();
		self.findHeaders();
		self.findFooters();
		console.log(ko.toJSON(self.article))
	}
	self.uploadImage = function(){}

	self.pressEnter = function(event){
		console.log(event.target)
	}

	// =================================
	// modal status controls visible modal

	self.modalStatus = ko.observable();
	self.closeModal = function(){
		self.modalStatus('');
	}
	self.showSettings = function(){
		self.modalStatus('settings')
	}
	self.showRequests = function(){
		self.modalStatus('requests')
	}
	self.showDebug = function(){
		self.modalStatus('debug')
	}

	// =================================
	// useful bits

	self.saveDestinations = ko.observableArray(['Articles','Drafts','Landing Pages','Error Pages']);

	// =================================
	// init function called on load
	// loads file lists
	var init = function(){
		var api_urls = $([{
			directory: "jsondocs",
			array: 'liveArticles'
		},{
			directory:"drafts",
			array: 'drafts'
		},{
			directory:"errorpages",
			array: 'errorPages'
		},{
			directory:"landingpages",
			array: 'landingPages'
		},{
			directory:"csslist",
			array: 'cssFiles'
		},{
			directory:"headerlist",
			array: 'headerFiles'
		},{
			directory:"footerlist",
			array: 'footerFiles'
		}]);

		api_urls.each(function(){
			
			var url = "/auth/"+this.directory;
			var fileType = this.directory;
			var target = this.array;
			utils.issue(url,null,function(err,stat,text){
				if (err){

				} else if (stat !== 200) {

				} else {
					var parsed = JSON.parse(text);
					parsed.forEach(function(newFile){
						self[target].push(new file(newFile,fileType,false))
					})
				}
			})
		})
		console.log(self.article)
	}
	init();
}

var wato = { viewmodel: new AppViewModel()};


 // auto-running function checks query string to load article or make new article

 (function(){
 	if (window.location.search) {
 		var query = window.location.search.replace('?','');
 		var parts = query.split('&');
 		var queryObject = {};
 		for (i=0;i<parts.length;i++){
 			var keyValue = parts[i].split('=');
 			queryObject[keyValue[0]] = keyValue[1]
 		}
 		if (queryObject.doc && queryObject.type){
 			wato.viewmodel.getFile({type: queryObject.type, title: queryObject.doc})
 		}
 		ko.applyBindings(wato.viewmodel);
 	} else {

 		ko.applyBindings(wato.viewmodel);
 	}
 })();


