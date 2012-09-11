$.fn.extend({
    _on: function(eventName, handler, context){
        this.on(eventName, $.proxy(handler, context));
    }
});

var Config, Model, App;

Config = {
    url: '/api/tasks/',
    selectors: {
        body: '.b-main',
        container: '.b-tasks',
        list: '.b-list',
        listItem: '.b-list-item',
        add: '.b-list-item__add',
        checkbox: '.b-list-item__checkbox'
    },
    classes: {
    },
    templates: {
        list: $('#list-template').html(),
        listItem: $('#list-item-template').html()
    }
};

var mock = [
    {
        id: 1,
        text: 'wrrtj6uki8k',
        start: '2012-09-11T13:41:46.020Z',
        finish: null,
        done: false,
        parent: 0,
        order: 1
    },
    {
        id: 2,
        text: 'xvdnu7h54g4c',
        start: '2012-09-11T13:41:47.020Z',
        finish: null,
        done: true,
        parent: 1,
        order: 1
    },
    {
        id: 3,
        text: '78967u4t34f45gb5h',
        start: '2012-09-11T13:41:48.020Z',
        finish: null,
        done: false,
        parent: 1,
        order: 2
    },
    {
        id: 4,
        text: 'dghntymkuyj6rf',
        start: '2012-09-11T13:41:49.020Z',
        finish: null,
        done: false,
        parent: 0,
        order: null
    }
];


Model = function(params){
    this.params = params;
    this.initial = {};
    this.current = {};
};

Model.prototype.onChange = function(handler, context){
    this.__onChange = $.proxy(handler, context);
};

Model.prototype.onRevert = function(handler, context){
    this.__onRevert = $.proxy(handler, context);
};

Model.prototype.set = function(params){
    var changes = {};
    for ( var key in params ) {
        if ( this.current[key] !== params[key] ) {
            this.current[key] = params[key];
            changes[key] = params[key];
        }
    }
    if ( !_.isEmpty(changes) && this.__onChange ) {
        this.__onChange(changes);
    }
    if ( !_.isEmpty(changes) && this.__onRevert && _.isEqual(this.initial, this.current) ) {
        this.__onRevert();
    }
};

Model.prototype.revert = function(){
    if ( !_.isEqual(this.initial, this.current) ) {
        this.current = _.clone(this.initial);
        if ( this.__onRevert ) {
            this.__onRevert();
        }
    }
};

Model.prototype.get = function(key){
    return this.current[key];
};

Model.prototype.fetch = function(callbacks){

    // todo: replace

    this.initial = _.clone(mock);
    this.current = _.clone(mock);
    callbacks.success(mock);
    return;

    $.ajax({
        url: this.params.url,
        complete: function(response){
            if ( response.status === 200 ) {
                var data = $.parseJSON(response.responseText);
                this.initial = _.clone(data);
                this.current = _.clone(data);
                callbacks.success(data);
            }
            else {
                callbacks.error(response);
            }
        }
    });
};

Model.prototype.save = function(callbacks){
    $.ajax({
        url: this.params.url,
        type: 'POST',
        complete: function(response){
            if ( response.status === 200 ) {
                // todo: check response
                callbacks.success();
            }
            else {
                callbacks.error(response);
            }
        }
    });
};



App = {
    init: function(){
        this.els = {};
        this.els.container = $(Config.selectors.container);

        this.model = new Model({
            url: Config.url
        });
        this.model.fetch({
            success: $.proxy(function(){
                this.render(this.model, this.els.container, $.proxy(this.bindListEvents, this));
            }, this),
            error: $.proxy(function(){
                console.error('Can\'t fetch model');
            }, this)
        });

        this.model.onChange(function(){
            console.log('model on change', arguments, this);
        }, this);

        this.model.onRevert(function(){
            console.log('model on revert', arguments, this);
        }, this);

    },
    getNodes: function(selectors){
        var nodes = {};
        for ( var name in selectors ) {
            nodes[name] = $(selectors[name]);
        }
        return nodes;
    },
    render: function(data, container, callback){
        container
            .html(this.getChildTasksHtml(data, 0));
        callback();
    },
    getChildTasksHtml: function(data, level){
        var tasks = this.getChildTasks(data, level),
            tasksHtml = [];
        if ( !tasks.length ) {
            return '';
        }
        tasks = this.sortTasks(tasks);
        for ( var i = 0, l = tasks.length; i < l; i++ ) {
            var task = tasks[i],
                taskHtml = _.template(Config.templates.listItem, _.extend(task, {
                    tasksHtml: this.getChildTasksHtml(data, task.id)
                }));
            tasksHtml.push(taskHtml);
        }
        return _.template(Config.templates.list, {
            tasksHtml: tasksHtml.join('\n')
        });
    },
    getChildTasks: function(data, level){
        var result = [];
        for ( var i = 0, l = data.length; i < l; i++ ) {
            var task = data[i];
            if ( task.parent === level ) {
                result.push(task);
            }
        }
        return result;
    },
    sortTasks: function(data){
        var sorting = {
                order: function(a,b){
                    return a.order < b.order ? -1 : 1;
                },
                date: function(a,b){
                    var _a = Date.parse(a.start),
                        _b = Date.parse(b.start);
                    return +_a < +_b ? -1 : 1;
                }
            },
            tasks = {
                active: {
                    all: [],
                    order: [],
                    date: []
                },
                completed: {
                    all: [],
                    order: [],
                    date: []
                }
            },
            concatenated = {};

        for ( var i = 0, l = data.length; i < l; i++ ) {
            var item = data[i];
            item.done
                ? tasks.completed.all.push(item)
                : tasks.active.all.push(item);
        }
        for ( var type in tasks ) {
            var taskArr = tasks[type].all;
            for ( var j = 0, n = taskArr.length; j < n; j++ ) {
                var task = taskArr[j];
                task.order
                    ? tasks[type].order.push(task)
                    : tasks[type].date.push(task);
            }
            concatenated[type] = tasks[type].order
                .sort(sorting.order)
                .concat( tasks[type].date.sort(sorting.date) );
        }
        return concatenated.active
            .concat(concatenated.completed);
    },
    bindListEvents: function(){
        this.els = this.getNodes(Config.selectors);
        console.log('bind list events', this.els.list);
    }
};
