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
    this._params = params;
    this._initial = [];
    this._current = [];
};

Model._events = {
    change: null,
    revert: null
};

Model.prototype._equals = function(arr1, arr2){
    if ( arr1.length === arr2.length ) {
        for ( var i = 0, l = arr1.length; i < l; i++ ) {
            if ( !_.isEqual(arr1[i], arr2[i]) ) {
                return false;
            }
        }
        return true;
    }
    else {
        return false;
    }
};

Model.prototype.on = function(event, handler, context){
    this._events[event] = $.proxy(handler, context);
};

Model.prototype.set = function(id, params){
    var item = this.get(id),
        changes = {};
    _.each(params, function(value, key){
        if ( item[key] !== value ) {
            changes[key] = value;
            item[key] = value;
        }
    });
    if ( !_.isEmpty(changes) && this._events.change ) {
        this._events.change(id, changes);
    }
    if ( !_.isEmpty(changes) && this._equals(this._current, this._initial) && this._events.revert ) {
        this._events.revert();
    }
};

Model.prototype.remove = function(id){
    var item = this.get(id);
    if ( item ) {
        this._current = _.reject(this._current, function(item){ return item.id === id });
        if ( this._events.change ) {
            this._events.change(id, null);
        }
    }
};

Model.prototype.get= function(id){
    return _.find(this._current, function(item){ return item.id === id; });
};

Model.prototype.revert = function(){
    if ( !this._equals(this._current, this._initial) ) {
        this._current = this._initial.slice();
        if ( this._events.revert ) {
            this._events.revert();
        }
    }
};

Model.prototype.fetch = function(callbacks){

    this._initial = mock.slice();
    this._current = mock.slice();
    callbacks.success(mock);

    $.ajax({
        url: this._params.url,
        complete: function(response){
            if ( response.status === 200 ) {
                var data = $.parseJSON(response.responseText);
                if ( data ) {
                    this._initial = data.slice();
                    this._current = data.slice();
                    return callbacks.success(data);
                }
            }
            callbacks.error(response);
        }
    });
};

Model.prototype.save = function(callbacks){
    $.ajax({
        url: this._params.url,
        type: 'POST',
        complete: function(response){
            if ( response.status === 200 ) {
                var data = $.parseJSON(response.responseText);
                if ( data.status === 'OK' ) {
                    return callbacks.success();
                }
            }
            callbacks.error(response);
        }
    });
};

Model.prototype.sync = function(){
    // navigator.onLine
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
        this.model.on('change', function(id, changes){
            console.log('*** model change', id, changes, '|', arguments, this);
        }, this);
        this.model.on('revert', function(){
            console.log('*** model revert', arguments, this);
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
