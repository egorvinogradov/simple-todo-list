var App;

App = function(config){
    this.config = config;
};

App.prototype.keyConfig = {
    addRowAboveToSelection: {
        condition: function(event){
            return event.shiftKey && event.which === 38;
        },
        behaviour: function(event){
            this.changeSelection({
                up: true,
                multiple: true
            });
            event.preventDefault();
        }
    },
    addRowBelowToSelection: {
        condition: function(event){
            return event.shiftKey && event.which === 40;
        },
        behaviour: function(){
            this.changeSelection({
                down: true,
                multiple: true
            });
            event.preventDefault();
        }
    },
    moveSelectionUp: {
        condition: function(event){
            return !event.shiftKey && event.which === 38;
        },
        behaviour: function(){
            this.changeSelection({
                up: true
            });
        }
    },
    moveSelectionDown: {
        condition: function(event){
            return !event.shiftKey && event.which === 40;
        },
        behaviour: function(){
            this.changeSelection({
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
    },
    addTask: {
        condition: function(event){
            return false; // todo: fix
        },
        behaviour: function(event){
            var task = $(event.target).parents(this.config.selectors.listItem);
            this.addTask(task);
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
            this.render(
                this.model.toArray(),
                this.container,
                $.proxy(this.bindEvents, this)
            );
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

App.prototype.getFocusedTask = function(){
    return this.getTasks().filter('.' + this.config.classes.focused);
};

App.prototype.resetSelection = function(){
    return this.getSelectedTasks().removeClass(this.config.classes.selected);
};

App.prototype.getTaskIndex = function(task){
    task = task instanceof jQuery
        ? task
        : this.getTasks(task);
    var tasks = this.getTasks();
    for ( var index = 0, l = tasks.length; index < l; index++ ) {
        if ( tasks.eq(index).is(task) ) {
            return index;
        }
    }
};

App.prototype.changeSelection = function(params){

//    var tasks = this.getTasks(),
//        selected = this.getSelectedTasks(),
//        focused = this.getFocusedTask(),
//        first = selected.first(),
//        last = selected.last(),
//        firstIndex,
//        lastIndex,
//        next;






    var tasks = this.getTasks(),
        selected = this.getSelectedTasks(),
        focused = this.getFocusedTask();




    // 1 down; no selection - last
    // 2 up; no selection - first

    // focused is first & up; focused is last &  - first
    // focused is last & down - last

    // selection down - last
    // selection up - last



//    firstIndex = this.getTaskIndex(first);
//    lastIndex = this.getTaskIndex(last);
//    next = tasks.eq( params.up ? --lastIndex : ++lastIndex );

    if ( params.multiple ) {

        //console.log('add row to selection', params.up ? 'above' : 'below');

        if ( focused.is(selected.first()) && params.up ) {
            // add row above
            console.log('add row above');
            return;
        }

        if ( focused.is(selected.first()) && params.down ) {
            // remove focused row
            // move focus down
            console.log('remove focused row && move focus down');
            return;
        }

        if ( focused.is(selected.last()) && params.up ) {
            // remove focused row
            // move focus up
            console.log('add row below && move focus up');
            return;
        }

        if ( focused.is(selected.last()) && params.down ) {
            // add row below
            console.log('add row below');
            return;
        }

        console.log('OOPS, can\'t change selection', selected, focused, params);

    }
    else {

        var next,
            focusedIndex = this.getTaskIndex(focused);

        if ( params.up ) {
            next = tasks.eq(--focusedIndex);
            if ( !next.length ) {
                next = tasks.eq(--tasks.length);
            }
        }
        else {
            next = tasks.eq(++focusedIndex);
            if ( !next.length ) {
                next = tasks.eq(0);
            }
        }

        console.log('move focus');

        selected.removeClass(this.config.classes.selected);
        next.addClass(this.config.classes.selected)
            .find(this.config.selectors.text)
            .first()
            .focus();

        // todo: set caret position

    }
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

    console.log('bind new events');

    var _window = $(window),
        tasks = this.getTasks(),
        texts = tasks.find(this.config.selectors.text);
    _window
        ._on('keydown', this.onWindowKeydown, this)
        ._on('click', this.onWindowClick, this);
    texts
        ._on('focus', this.onInputStart, this)
        ._on('blur', this.onInputEnd, this)
        ._on('keyup paste', this.onInput, this);
    tasks
        .first()
        .addClass(this.config.classes.selected)
        .find(texts)
        .focus();
};

App.prototype.onWindowKeydown = function(event){

//    console.log(
//        'key down',
//        event.target,
//        event.which,
//        event.shiftKey
//            ? 'shift'
//            : '',
//        event.ctrlKey
//            ? 'ctrl'
//            : ''
//    );

    var config = this.keyConfig;
    for ( var action in config ) {
        if ( config[action].condition.call(this, event) ) {
            config[action].behaviour.call(this, event);
        }
    }
};

App.prototype.onWindowClick = function(event){
    console.log('on window click nothing happens');
};

App.prototype.onInputStart = function(event){
    var element = $(event.currentTarget),
        task = element.parents(this.config.selectors.listItem).first();
    element.data({
        before: this.trimTags(element.html())
    });
    this.getTasks().removeClass(this.config.classes.focused);
    task.addClass(this.config.classes.focused);
    //console.log('start', task);
};

App.prototype.onInputEnd = function(event){

    // nothing happens

    var element = $(event.currentTarget),
        task = element.parents(this.config.selectors.listItem).first();
    //console.log('end: nothing happens', task);
};

App.prototype.onInput = function(event){
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
        console.log('task changed:', text);
    }
};

App.prototype.addTask = function(previousSibling){
    console.log('add task after', previousSibling);
};
