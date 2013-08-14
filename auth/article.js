function file(title,type){
	self.title = title;
	self.type = type;
}
function catTag(name){
	this.name = name;
}

function AppViewModel(){
	var self = this;

	// Article Properties

	self.title = ko.observable('New Article');
	self.slug = ko.computed(function(){
		return self.title().replace(/\s/g,'').toLowerCase()
	})
	self.publishDate = ko.observable(new Date());
	self.content = ko.observableArray();
	self.tags = ko.observableArray([{name: 'sample1'},{name:'sample2'}]);
	self.categories = ko.observableArray([{name: 'sample1'},{name:'sample2'}]);
	self.hideTitle = ko.observable(false);
	self.previewText = ko.observable('preview text');
	self.headerTags = ko.observable();
	self.cssFiles = ko.observableArray();
	self.headerFiles = ko.observableArray();
	self.footerFiles = ko.observableArray();
	self.saveDestinations = ko.observableArray(['Articles','Drafts','Landing Pages','Error Pages']);
	self.selectedDestination = ko.observable();
	self.selectedDestination.subscribe(function(value){
		console.log(value)
	})


	// =================================
	// MenuLists

	self.articleList = ko.observableArray

	// =================================
	// UI controle

	self.newTag = ko.observable();
	self.deleteTag = function(element){
		self.tags.remove(element);
		console.log(element);
	}
	self.addTag = function(){
		self.tags.push(new catTag(self.newTag()))
		self.newTag('');
	}

	self.newCat = ko.observable();
	self.deleteCat = function(element){
		self.categories.remove(element);
	}
	self.addCat = function(){
		self.categories.push(new catTag(self.newCat()))
		self.newCat('');
	}
	self.newDocument = function(){}
	self.exportFile = function(){}
	self.preview = function(){}
	self.save = function(){
		console.log(self.saveDestination())
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
	// init function called on load
	var init = function(){
		//alert('working!')
	}
	init();

	console.log(self);
}

var wato = { viewmodel: new AppViewModel()};

ko.applyBindings(wato.viewmodel);
