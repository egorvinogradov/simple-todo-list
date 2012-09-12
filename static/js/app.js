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
    this.is_save_timer = true;
    this.model.set(id, params);
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

App.prototype.getTaskGlobalIndex = function(task){
    var siblingTasks = $(this.config.selectors.listItem, task.parent());
    for ( var i = 0, l = siblingTasks.length; i < l; i++ ) {
        var currentTask = siblingTasks.eq(i);
        if ( currentTask.is(task) ) {
            return i;
        }
    }
};

//App.prototype.getSelectedTasks = function(){
//    return $(this.config.selectors.wrapper)
//        .filter('.' + this.config.classes.selected)
//        .last()
//        .parent();
//};

App.prototype.getSiblingTasks = function(task){
    var parent = task && task.parent().length
        ? task.parent()
        : document;
    return $(this.config.selectors.listItem, parent);
};

App.prototype.getNextTask = function(task){
    var siblingTasks = this.getSiblingTasks(task),
        currentIndex = this.getTaskGlobalIndex(task);
    return siblingTasks.eq( currentIndex + 1 );
};

App.prototype.getPreviousTask = function(task){
    var siblingTasks = this.getSiblingTasks(task),
        currentIndex = this.getTaskGlobalIndex(task);
    return siblingTasks.eq( currentIndex - 1 );
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
        //this.bindListItemEvents( $(this.config.selectors.wrapper, task) );
        this.bindTextEditingEvents( $(this.config.selectors.text, task) );
        this.bindCheckboxEvents( $(this.config.selectors.checkbox, task) );
        this.bindAddButtonEvents( $(this.config.selectors.add, task) );
    }, this));
    this.bindKeyEvents();
};

App.prototype.bindKeyEvents = function(){
    console.log('bind key events');

    $(window)._on('keydown', function(event){

        var allTasks = this.getSiblingTasks(),
            allTasksFirst = allTasks.first(),
            allTasksLast = allTasks.last(),
            currentSelection = this.getSelectedTasks(),
            currentSelectionFirst = currentSelection.first(),
            currentSelectionLast = currentSelection.last(),
            nextTask = this.getNextTask(currentSelectionLast),
            previousTask = this.getPreviousTask(currentSelectionLast);

//        console.log(
//            'key down',
//            event.currentTarget,
//            event.target,
//            event.which,
//            event
//        );

        window._e = event;

        if ( event.shiftKey && event.which === 38 ) {
            // select up
        }

        if ( event.shiftKey && event.which === 40 ) {
            // select down
        }
        if ( !event.shiftKey && event.which === 38 ) { // move selection up
            this.moveSelection({ up: true });
        }
        if ( !event.shiftKey && event.which === 40 ) { // move selection down
            this.moveSelection({ down: true });
        }

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

//App.prototype.moveSelectionDown = function(){
//    var tasks = this.getTaskElements(),
//        selection = this.getSelectedTasks(),
//        current = this.getTaskIndex( selection.last() ),
//        next = tasks.eq( current + 1 );
//    next = next.length
//        ? next
//        : tasks.first();
//    selection.children(this.config.selectors.wrapper).removeClass(this.config.classes.selected);
//    next.children(this.config.selectors.wrapper).addClass(this.config.classes.selected);
//    //console.log('\n\n move selection down \n\n', selection, '\n\n', tasks, '\n\n', current, '\n\n', next);
//};
//
//App.prototype.moveSelectionUp = function(){
//    var tasks = this.getTaskElements(),
//        selection = this.getSelectedTasks(),
//        current = this.getTaskIndex( selection.last() ),
//        prev = tasks.eq( current + 1 );
//    prev = prev.length
//        ? prev
//        : tasks.last();
//    selection.children(this.config.selectors.wrapper).removeClass(this.config.classes.selected);
//    prev.children(this.config.selectors.wrapper).addClass(this.config.classes.selected);
//    console.log('\n\n move selection down \n\n', selection, '\n\n', tasks, '\n\n', current, '\n\n', next);
//};


App.prototype.moveSelection = function(params){
    var tasks = this.getTaskElements(),
        selection = this.getSelectedTasks(),
        current = this.getTaskIndex( selection.last() ),
        next = tasks.eq( params.up ? current - 1 : current + 1 );
    next = next.length
        ? next
        : tasks.filter( params.up ? ':last' : ':first' );
    selection.children(this.config.selectors.wrapper).removeClass(this.config.classes.selected);
    next.children(this.config.selectors.wrapper).addClass(this.config.classes.selected);
    console.log('move selection ' + params.up ? 'up' : 'down', current);
    //console.log('\n\n move selection ' + params.up ? 'up' : 'down' + ' \n\n', selection, '\n\n', tasks, '\n\n', current, '\n\n', next);
};



//App.prototype.bindListItemEvents = function(els){
//
//    var allTasks = $(this.config.selectors.wrapper);
//
//    els._on('mouseover', function(event){
//        var currentTask = $(event.currentTarget);
//        $(event.currentTarget).addClass(this.config.classes.selected);
//        allTasks.not(currentTask).removeClass()
//        event.stopPropagation();
//    }, this);
//    els._on('mouseout', function(event){
//        $(event.currentTarget).removeClass(this.config.classes.selected);
//        event.stopPropagation();
//    }, this);
//};

App.prototype.bindTextEditingEvents = function(els){

    els.each(function(i, element){
        element.contentEditable = true;
    });

    els._on('focus', function(event){
        var element = $(event.currentTarget);
        element.data({
            before: $.trim(element.html())
        });
    }, this);

    els._on('blur keyup paste', function(event){
        var element = $(event.currentTarget),
            text = $.trim(element.html()),
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
            //task.addClass(this.config.classes.completed);
            this.setModel(id, {
                done: checked,
                finish: new Date().toISOString()
            });
        }
        else {
            //task.removeClass(this.config.classes.completed);
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
