var App;

App = function(config){
    this.config = config;
};

App.prototype.init = function(){
    this.els = {};
    this.els.container = $(this.config.selectors.container);

    this.model = new Model({
        url: this.config.url
    });
    this.model.fetch({
        success: $.proxy(function(){
            console.log('model fetch success', this.model);
            this.render(this.model.toArray(), this.els.container, $.proxy(this.bindEvents, this));
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
    console.log('^^^ set model', params);
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
                console.log('^^^ saved');
            }, this),
            error:$.proxy(function(data){
                console.error('Can\'t save model', data);
            }, this)
        });
    }, this), 1000);
};

App.prototype.bindEvents = function(tasks){
    tasks = tasks && tasks.length
        ? tasks
        : $(this.config.selectors.listItem);
    tasks.eq(0)
        .find(this.config.selectors.wrapper)
        .first()
        .addClass(this.config.classes.selected);
    tasks.each($.proxy(function(i, task){
        this.bindTextEditingEvents( $(this.config.selectors.text, task) );
        //this.bindCheckboxEvents( $(this.config.selectors.checkbox, task) );
        //this.bindAddButtonEvents( $(this.config.selectors.add, task) );
    }, this));
    this.bindKeyEvents(this.keys);
};

App.prototype.bindTextEditingEvents = function(els){

    els.each(function(i, element){
        element.contentEditable = true;
    });

    els._on('focus', function(event){
        var element = $(event.currentTarget);
        element.data({
            //before: $.trim(element.html())
            before: this.trimTags(element.html())
        });
    }, this);

    els._on('blur keyup paste', function(event){
        var element = $(event.currentTarget),
            //text = $.trim(element.html()),
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

App.prototype.bindCheckboxEvents = function(els){
    els._on('change', function(event){
        var checkbox = $(event.currentTarget),
            task = checkbox.parents(this.config.selectors.listItem),
            id = +task.data('id'),
            checked = !!checkbox.filter(':checked').length;
        if ( checked ) {
            this.setModel(id, {
                done: checked,
                finish: new Date().toISOString()
            });
        }
        else {
            this.setModel(id, {
                done: checked,
                finish: null
            });
        }
    }, this);
};

App.prototype.bindAddButtonEvents = function(els){

    els._on('click', function(event){
        var els = {},
            data = {},
            newTask = {};

        els.task = $(event.currentTarget).parents(this.config.selectors.listItem);
        els.parent = els.task.parents(this.config.selectors.listItem);
        data.id = +els.task.data('id');
        data.parent = +els.parent.data('id') || 0;
        newTask.id = +new Date();
        newTask.data = {
            id: newTask.id,
            parent: data.parent,
            text: this.config.newTaskText,
            start: new Date(newTask.id).toISOString(),
            finish: null,
            order: null,
            done: false
        };
        newTask.html = _.template(this.config.templates.listItem, _.extend(newTask.data, { tasksHtml: '' }));
        newTask.element = $(newTask.html);

        els.task.after(newTask.element);
        this.setModel(newTask.id, newTask.data);
        this.bindEvents(newTask.element);
        newTask.element
            .find(this.config.selectors.text)
            .focus();
    }, this);
};

App.prototype.keys = {
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
            var id = +$(event.target)
                .parents(this.config.selectors.listItem)
                .data('id');
            this.removeTask(id);
        }
    },
    resolveTask: {
        condition: function(event){
            return ''
        },
        behaviour: function(event){

        }
    }
};

App.prototype.bindKeyEvents = function(config){

    var _window = $(window);

    _window._on('keydown', function(event){
        console.log(
            'key down',
            event.currentTarget,
            event.target,
            event.which,
            event.shiftKey ? 'shift' : '',
            event.ctrlKey ? 'ctrl' : ''
        );
        for ( var action in config ) {
            if ( config[action].condition.call(this, event) ) {
                config[action].behaviour.call(this, event);
            }
        }
    }, this);

    _window._on('click', function(){
        this.getSelectedTasks()
            .find(this.config.selectors.wrapper)
            .removeClass(this.config.classes.selected);
    }, this);
};

App.prototype.getTaskElements = function(sibling){
    var parent = sibling && sibling.parent().length
        ? sibling.parent()
        : document;
    return $(this.config.selectors.listItem, parent);
};

App.prototype.getSelectedTasks = function(){
    return $(this.config.selectors.wrapper)
        .filter('.' + this.config.classes.selected)
        .parent();
};

App.prototype.getTaskIndex = function(task){
    var tasks = this.getTaskElements();
    for ( var i = 0, l = tasks.length; i < l; i++ ) {
        if ( tasks.eq(i).is(task) ) {
            return i;
        }
    }
};

App.prototype.moveSelection = function(params){

    var tasks = this.getTaskElements(),
        selection = this.getSelectedTasks(),
        current = this.getTaskIndex( selection.last() ),
        next = tasks.eq( params.up ? current - 1 : current + 1 );

    if ( params.multiple && !next.length ) {
        return;
    }
    if ( !params.multiple ) {
        selection
            .children(this.config.selectors.wrapper)
            .removeClass(this.config.classes.selected);
    }
    next = next.length
        ? next
        : tasks.filter( params.up ? ':last' : ':first' );
    next
        .children(this.config.selectors.wrapper)
        .toggleClass(this.config.classes.selected);

    console.log('move selection ' + ( params.up ? 'up' : 'down' ) + ( params.multiple ? ', multiple' : '' ), current);
};

App.prototype.removeTask = function(id){
    $(this.config.selectors.listItem)
        .filter('[data-id="' + id + '"]')
        .remove();
    this.setModel(id, null);
};

App.prototype.addTask = function(taskBefore){

    var els = {},
        data = {},
        newTask = {};

    els.task = taskBefore.parents(this.config.selectors.listItem);
    els.parent = els.task.parents(this.config.selectors.listItem);
    data.id = +els.task.data('id');
    data.parent = +els.parent.data('id') || 0;
    newTask.id = +new Date();
    newTask.data = {
        id: newTask.id,
        parent: data.parent,
        text: this.config.newTaskText,
        start: new Date(newTask.id).toISOString(),
        finish: null,
        order: null,
        done: false
    };
    newTask.html = _.template(this.config.templates.listItem, _.extend(newTask.data, { tasksHtml: '' }));
    newTask.element = $(newTask.html);

    els.task.after(newTask.element);
    this.setModel(newTask.id, newTask.data);
    this.bindEvents(newTask.element);
    newTask.element
        .find(this.config.selectors.text)
        .focus();
};
