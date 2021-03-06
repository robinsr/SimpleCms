/*
 *  article.js 
 *  Ryan Robinson
 *  ryan.b.robinson@gmail.com
 *
 */

 if (Modernizr.draganddrop) {
 	console.log('drag drop yes')
 } else {
 	console.log('drag drop no')
 }

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
 	this.order = ko.observable(order);
 	this.text = text ? ko.observable(text) : ko.observable();
 }

 function alert(type,title,message){
 	this.type = type;
 	this.title = title;
 	this.message = message;
 }

 ko.bindingHandlers.drag = {
 	init: function(element, valueAccessor, allBindingsAccessor, viewModel, context) {
 		if (Modernizr.draganddrop) {
 			$(element).each(function(){
 				$(this).on('dragstart',function(e){
 					var value = allBindingsAccessor();
 					e.originalEvent.dataTransfer.setData("please work", "in firefox")
 					wato.viewmodel.dragElement(viewModel);
 				}).on('dragend',function(e){
 					wato.viewmodel.dragElement(null);
 				})
 			})
 		} else {
 			$(element).each(function(){
 				var $dragging = null;
 				$(this).on("mousedown", function(e) {
 					$(this).attr('unselectable', 'on').addClass('draggable');
 					var el_w = $('.draggable').outerWidth(),
 					el_h = $('.draggable').outerHeight();
 					$('body').on("mousemove", function(e) {
 						if ($dragging) {
 							$dragging.offset({
 								top: e.pageY - el_h / 2,
 								left: e.pageX - el_w / 2
 							});
 						}
 					});
 					$dragging = $(e.target);
 				}).on("mouseup", function(e) {
 					$dragging = null;
 					$(this).removeAttr('unselectable').removeClass('draggable');
 				});
 			})
 		}
 	}	
 }
 ko.bindingHandlers.drop = {
 	init: function(element, valueAccessor, allBindingsAccessor, viewModel, context) {
 		if (Modernizr.draganddrop) {
 			$(element).each(function(){
 				
		  		// $(this).
		  		$(this).on('dragover',function(e){
		  			e.preventDefault();
		  			$(this).addClass('alert-error');
		  		}).on('dragleave',function(e){
		  			e.preventDefault()
		  			$(this).removeClass('alert-error');
		  		}).on('drop',function(ev){
		  			ev.stopPropagation();
		  			ev.preventDefault();
    				// REORDER MODEL WITH INDEX VALUE OF MOVING ELEMENT, AND POSITION OF TARGET ELEMENT
    				wato.viewmodel.reorderModel(wato.viewmodel.dragElement().order(),viewModel.order())
    				$(this).removeClass('alert-error');
    			})
		  	})
 		} else {
 			$(element).each(function(){
 				$(this).hover(function(e){
 					console.log('mouse is in position')
 					$(this).on("mouseup",function(e){
 						console.log('dropped')

 					})
 				})
 			})
 		}
 	}
 }

 function AppViewModel(){
 	var self = this;

 	self.article = {
 		title : ko.observable('New Article'),
 		url : ko.observable(''),
 		publishDate : ko.observable(new Date()),
 		content : ko.observableArray([]),
 		tags : ko.observableArray([]),
 		categories : ko.observableArray([]),
 		hideTitle : ko.observable(false),
 		previewtext : ko.observable(''),
 		headerTags : ko.observable(''),
 		selectedDestination : ko.observable(''),
 		css : ko.observableArray([]),
 		header : ko.observableArray([]),
 		footer : ko.observableArray([]),

	 	// write access specifies basic permissions

	 	writeAccess : ko.observable(0)
	 }

	 self.alert = ko.observableArray([]);

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
	self.dragElement = ko.observable(null);

	self.getFile = function(me){
		console.log(me);
		utils.issue('/'+me.type+'/'+me.title,null,function(err,stat,text){
			console.log(err,stat,text);
			if (err || stat != 200){
				self.alert.push(new alert('error','Error!','Failed to load '+me.title))
			} else {
				var parsed = JSON.parse(text)

				self.article.title(parsed.title)
				self.article.url(parsed.url)
				self.article.publishDate(parsed.publishDate)

				self.article.content.removeAll();
				$(parsed.content).each(function(index){
					self.article.content.push(new contentBlock(this.type,index,this.text))
				})

				self.article.tags.removeAll();
				$(parsed.tags).each(function(){
					if ($.type(this) == 'object'){
						self.article.tags.push(new catTag(this.name))
					} else if ($.type(this) == 'string'){
						self.article.tags.push(new catTag(this))
					}
				})

				self.article.categories.removeAll();
				if (parsed.categories) {
					$(parsed.categories).each(function(){
						if ($.type(this) == 'object'){
							self.article.categories.push(new catTag(this.name))
						} else if ($.type(this) == 'string'){
							self.article.categories.push(new catTag(this))
						}
					})
				} else if (parsed.category) {
					self.article.categories.push(new catTag(parsed.category))
				}

				self.article.hideTitle(parsed.hideTitle)
				self.article.previewtext(parsed.previewtext)
				self.article.headerTags(parsed.headerTags)
				self.article.selectedDestination(parsed.selectedDestination)
				self.article.writeAccess(parsed.writeAccess);

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
				utils.fitToContent($('textarea'),10000)

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
	self.findIncludedFiles = function(){
		self.findCss();
		self.findFooters();
		self.findHeaders();
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
		self.article.content.splice(self.article.content.indexOf(me),0,me);
		utils.fitToContent();
	}
	self.dismiss = function(me){
		console.log(me);
		self.alert.remove(me);
	}
	self.reorderModel = function(movingElementIndex,destinationIndex){
		self.article.content.splice(destinationIndex,0,self.article.content.splice(movingElementIndex,1)[0]);
		utils.fitToContent($('textarea'),10000);

		var count = 0;
		ko.utils.arrayForEach(self.article.content(),function(piece){
			piece.order(count);
			count++
			return
		});

	}

	// =================================
	// document options

	self.newDocument = function(){
		self.article.title('New Article');
		self.article.url('');
		self.article.publishDate(new Date());
		self.article.content([]);
		self.article.tags([]);
		self.article.categories([]);
		self.article.hideTitle(false);
		self.article.previewtext('');
		self.article.headerTags('');
		self.article.selectedDestination('');
		self.article.css([]);
		self.article.header([]);
		self.article.footer([]);
		self.article.writeAccess(0);
	}
	self.exportFile = function(){}
	self.preview = function(){
		self.findIncludedFiles();
		utils.issue("/auth/quickpreview",ko.toJSON(self.article),function(err,stat,text){
			if (err || stat != 200){
				self.alert.push(new alert('error','Error!','There was a problem generating your preview'))
			} else {
				window.open('/auth/preview.html');
			}
		})
	}
	self.save = function(){
		self.findIncludedFiles();
		if (self.article.css().length == 0){
			self.alert.push(new alert('','Warning!','You did not include and CSS files'))
		} else if (self.article.header().length == 0){
			self.alert.push(new alert('','Warning!','You did not include and header files'))
		} else if (self.article.footer().length == 0){
			self.alert.push(new alert('','Warning!','You did not include and footer files'))
		} else if (self.article.selectedDestination() == '' || typeof self.article.selectedDestination() == 'undefined'){
			self.alert.push(new alert('','Warning!','Please select a save destination'))
		} else {
			var saveArticle = ko.toJS(self.article);
			saveArticle.destination = directories[self.article.selectedDestination()];
			console.log(saveArticle)
			utils.issue('/auth/savedata',JSON.stringify(saveArticle),function(err,stat,text){
				if (err || stat != 200){
					self.alert.push(new alert('error','Error!',text))
				} else {
					self.alert.push(new alert('success','Success!',text))
				}
			})
		}
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

	self.dragActive = ko.observable(true);

	var directories = {
		'Articles':'jsondocs',
		'Drafts':'drafts',
		'Landing Pages':'landingpages',
		'Error Pages':'errorpages'
	}

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

 $(document).ready(function(){

 });
