/*
 *  article.js 
 *  Ryan Robinson
 *  ryan.b.robinson@gmail.com
 *
 */


 // object representing a file; used for makeing dropdowns
 function file(title,selected){
 	this.title = title;
 	this.selected = selected;
 }

 // object for category or tag 
 function catTag(name){
 	this.name = name;
 }

 // object for piece of content
 function contentBlock(type,order,content){
 	var self = this;
 	this.type = type ? ko.observable(type) : ko.observable('p');
 	this.order = order ? ko.observable(order) : ko.computed(function(){
 		return wato.viewmodel.article.content().length;
 	})
 	this.content = content ? ko.observable(content) : ko.observable();
 }

 // article object
 function article(obj){
 	var self = this;
 	this.title = obj.title ? ko.observable(obj.title) : ko.observable('New Article');
 	this.slug = obj.slug ? ko.observable(obj.slug) : ko.computed(function(){
 		return self.title().replace(/\s/g,'').toLowerCase()
 	});
 	this.publishDate = obj.publishDate ? ko.observable(obj.publishDate) : ko.observable(new Date());
 	this.content = obj.content ? ko.observableArray(obj.content) : ko.observableArray([]);
 	this.tags = obj.tags ? ko.observableArray(obj.tags) : ko.observableArray([]);
 	this.categories = obj.categories ? ko.observableArray(obj.categories) : ko.observableArray([]);
 	this.hideTitle = obj.hideTitle ? ko.observable(obj.hideTitle) : ko.observable(false);
 	this.previewText = obj.previewText ? ko.observable(obj.previewText) : ko.observable();
 	this.headerTags = obj.headerTags ? ko.observable(obj.headerTags) : ko.observable();
 	this.selectedDestination = obj.selectedDestination ? ko.observable(obj.selectedDestination) : ko.observable();
 	this.css = obj.css ? ko.observableArray(obj.css) : ko.observableArray();
 	this.header = obj.header ? ko.observableArray(obj.header) : ko.observableArray();
 	this.footer = obj.footer ? ko.observableArray(obj.footer) : ko.observableArray();
 }

 // sample article, no content yet
 var testArticle = {
 	title: "test article",
 	tags: [{name: "testtag1"},{name:"testtag2"}],
 	categories: [{name:"testcat1"},{name:"testcat2"}],
 	previewText : "this is test preview text",
 	selectedDestination : "Articles",
 	content: [{
 		content:'p - test content',
 		order: 1,
 		type: 'p'
 	},{
 		content:'pre - test content2',
 		order: 2,
 		type: 'pre'
 	}
 	]
 }

 function AppViewModel(){
 	var self = this;

 	self.article = {}

	// =================================
	// MenuLists - arrays holding file names; used in dropdowns

	self.liveArticles = ko.observableArray();
	self.drafts = ko.observableArray();
	self.landingPages = ko.observableArray();
	self.errorPages = ko.observableArray();
	self.cssFiles = ko.observableArray();
	self.headerFiles = ko.observableArray();
	self.footerFiles = ko.observableArray();

	// =================================
	// Controls for the menu lists - finds selected files and adds to article model

	self.findCss = function(){
		self.article.css.removeAll();
		ko.utils.arrayForEach(self.cssFiles(), function (file) {
			console.log(file)
			if (file.selected == true) {
				self.article.css.push({file:file.title})
			}
		})
	}
	self.findHeaders = function(){
		self.article.header.removeAll();
		ko.utils.arrayForEach(self.headerFiles(), function (file) {
			console.log(file)
			if (file.selected == true) {
				self.article.header.push({file:file.title})
			}
		})
	}
	self.findFooters = function(){
		self.article.footer.removeAll();
		ko.utils.arrayForEach(self.footerFiles(), function (file) {
			console.log(file)
			if (file.selected == true) {
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
		self.article.content.push(new contentBlock('p',null,'TEST CONTENT MAFA'))
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
			
			var url = "/auth/"+this.directory
			var target = this.array
			utils.issue(url,null,function(err,stat,text){
				if (err){

				} else if (stat !== 200) {

				} else {
					var parsed = JSON.parse(text);
					parsed.forEach(function(newFile){
						console.log('putting '+newFile+' into '+target);
						self[target].push(new file(newFile,false))
					})

				}
			})
		})
		self.article = new article(testArticle);
		console.log(ko.toJSON(self.article))
	}

	init();
}

var wato = { viewmodel: new AppViewModel()};

ko.applyBindings(wato.viewmodel);
