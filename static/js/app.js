var App;

App = function(config){
    this.config = config;
};

App.prototype.keyConfig = {
    addRowAboveToSelection: {
        condition: function(event){
            return event.shiftKey && event.which === 38;
        },
        behaviour: function(){
            this.moveSelection({
                up: true,
                multiple: true
            });
        }
    },
    addRowBelowToSelection: {
        condition: function(event){
            return event.shiftKey && event.which === 40;
        },
        behaviour: function(){
            this.moveSelection({
                down: true,
                multiple: true
            });
        }
    },
    moveSelectionUp: {
        condition: function(event){
            return !event.shiftKey && event.which === 38;
        },
        behaviour: function(){
            this.moveSelection({
                up: true
            });
        }
    },
    moveSelectionDown: {
        condition: function(event){
            return !event.shiftKey && event.which === 40;
        },
        behaviour: function(){
            this.moveSelection({
                down: true
            });
        }
    },
    removeTask: {
        condition: function(event){
            var target = $(event.target);
            return event.which === 8 && target.is(this.config.selectors.text) && !this.trimTags(target.html());
        },
        behaviour: function(event){
            var task = $(event.target).parents(this.config.selectors.listItem);
            this.removeTask(task);
        }
    },
    resolveTask: {
        condition: function(event){
            return false; // todo: fix
        },
        behaviour: function(event){
            var task = $(event.target).parents(this.config.selectors.listItem);
            this.resolveTask(task);
        }
    }
};

App.prototype.init = function(){
    this.container = $(this.config.selectors.container);
    this.model = new Model({
        url: this.config.url
    });
    this.model.fetch({
        success: $.proxy(function(){
            this.render(this.model.toArray(), this.container, $.proxy(this.bindEvents, this));
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
};

App.prototype.getNodes = function(selectors){
    var nodes = {};
    for ( var name in selectors ) {
        nodes[name] = $(selectors[name]);
    }
    return nodes;
};

App.prototype.trimTags = function(str){
    return str
        .replace(/(<([^>]+)>)/ig, ' ')
        .replace(/\n\s+/gm, '\n')
        .replace(/ +/gm, ' ')
        .replace(/^\s+/gm, '')
        .replace(/\s+$/gm, '');
};

App.prototype.render = function(data, container, callback){
    container
        .html(this.getChildTasksHtml(data, 0));
    callback();
};

App.prototype.getChildTasksHtml = function(data, level){
    var tasks = this.getChildTasks(data, level),
        tasksHtml = [];
    if ( !tasks.length ) {
        return '';
    }
    tasks = this.sortTasks(tasks);
    for ( var i = 0, l = tasks.length; i < l; i++ ) {
        var task = tasks[i],
            taskHtml = _.template(this.config.templates.listItem, _.extend(task, {
                tasksHtml: this.getChildTasksHtml(data, task.id)
            }));
        tasksHtml.push(taskHtml);
    }
    return _.template(this.config.templates.list, {
        tasksHtml: tasksHtml.join('\n')
    });
};

App.prototype.getChildTasks = function(data, level){
    var result = [];
    for ( var i = 0, l = data.length; i < l; i++ ) {
        var task = data[i];
        if ( task.parent === level ) {
            result.push(task);
        }
    }
    return result;
};

App.prototype.sortTasks = function(data){
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
};

App.prototype.setModel = function(id, params){
    if ( this.is_save_timer ) {
        clearTimeout(this.save_timer);
    }
    params
        ? this.model.set(id, params)
        : this.model.remove(id);
    this.is_save_timer = true;
    this.save_timer = setTimeout($.proxy(function(){
        this.is_save_timer = false;
        this.model.save({
            success: $.proxy(function(){
            }, this),
            error:$.proxy(function(data){
                console.error('Can\'t save model', data);
            }, this)
        });
    }, this), 1000);
};

App.prototype.getTasks = function(ids){
    var tasks = $(this.config.selectors.listItem, this.container),
        result = $();
    if ( !ids ) {
        return tasks;
    }
    ids = ids instanceof Array ? ids : [ids];
    for ( var i = 0, l = ids.length; i < l; i++ ) {
        var task = tasks.filter('[data-id=\'' + ids[i] + '\']');
        result = result.add(task);
    }
    return result;
};

App.prototype.selectTasks = function(tasks){
    tasks = tasks instanceof jQuery
        ? tasks
        : this.getTasks(tasks);
    tasks.addClass(this.config.classes.selected);
    return tasks;
};

App.prototype.getSelectedTasks = function(){
    return this.getTasks().filter('.' + this.config.classes.selected);
};

App.prototype.resetSelection = function(){
    return this.getSelectedTasks().removeClass(this.config.classes.selected);
};

App.prototype.moveSelection = function(params){
    
//        var tasks = this.getTaskElements(),
//        selection = this.getSelectedTasks(),
//        current = this.getTaskIndex( selection.last() ),
//        next = tasks.eq( params.up ? current - 1 : current + 1 );
//
//    if ( params.multiple && !next.length ) {
//        return;
//    }
//    if ( !params.multiple ) {
//        selection
//            .children(this.config.selectors.wrapper)
//            .removeClass(this.config.classes.selected);
//    }
//    next = next.length
//        ? next
//        : tasks.filter( params.up ? ':last' : ':first' );
//    next
//        .children(this.config.selectors.wrapper)
//        .toggleClass(this.config.classes.selected);

    console.log('move selection ' + ( params.up ? 'up' : 'down' ) + ( params.multiple ? ', multiple' : '' ), current);
};

App.prototype.removeTask = function(task){
    var taskEl,
        taskId;
    if ( task instanceof jQuery ) {
        taskEl = task;
        taskId = +taskEl.data('id');
    }
    else {
        taskId = task;
        taskEl = this.getTasks(taskId);
    }
    this.setModel(taskId, null);
    taskEl.remove();
};

App.prototype.resolveTask = function(task){
    var taskEl,
        taskId;
    if ( task instanceof jQuery ) {
        taskEl = task;
        taskId = +taskEl.data('id');
    }
    else {
        taskId = task;
        taskEl = this.getTasks(taskId);
    }
    this.setModel(taskId, {
        done: true
    });
    // todo: update DOM when model.change fires
};

App.prototype.bindEvents = function(){
    var tasks = this.getTasks();
    this.selectTasks(tasks.first());
    this.bindKeyEvents(this.keyConfig);
    this.bindTextEditingEvents(tasks);
};

App.prototype.bindKeyEvents = function(config){
    var frame = $(window);
    frame._on('keydown', function(event){
        console.log('key down', event.currentTarget, event.target, event.which, event.shiftKey ? 'shift' : '', event.ctrlKey ? 'ctrl' : '');
        for ( var action in config ) {
            if ( config[action].condition.call(this, event) ) {
                config[action].behaviour.call(this, event);
            }
        }
    }, this);
    frame._on('click', function(event){
        var target = $(event.target),
            task = target.is(this.config.selectors.wrapper)
                ? target
                : target.parents(this.config.selectors.wrapper);
        this.resetSelection();
        if ( task.length ) {
            this.selectTasks(task.parent());
        }
    }, this);
};

App.prototype.bindTextEditingEvents = function(tasks){

    var els = tasks.find(this.config.selectors.text);

    els.each(function(i, element){
        element.contentEditable = true;
    });

    els._on('focus', function(event){
        var element = $(event.currentTarget),
            task = element.parents(this.config.selectors.listItem).first();
        element.data({
            before: this.trimTags(element.html())
        });
        this.selectTasks(task);
    }, this);

    els._on('blur keyup paste', function(event){
        var element = $(event.currentTarget),
            text = this.trimTags(element.html()),
            task,
            id;
        if ( element.data('before') !== text ) {
            element.data({ before: text });
            task = element.parents(this.config.selectors.listItem);
            id = +task.data('id');
            this.setModel(id, {
                text: text
            });
        }
    }, this);
};
