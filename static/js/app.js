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
            this.render(this.model.toArray(), this.els.container, $.proxy(this.bindListEvents, this));
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

App.prototype.bindListEvents = function(){

    this.els = this.getNodes(this.config.selectors);

    this.els.text.each(function(i, element){
        element.contentEditable = true;
    });

    this.els.text._on('focus', function(event){
        var element = $(event.currentTarget);
        element.data({
            before: $.trim(element.html())
        });
    }, this);

    this.els.text._on('blur keyup paste', function(event){

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

    this.els.checkbox._on('change', function(event){
        var checkbox = $(event.currentTarget),
            task = checkbox.parents(this.config.selectors.listItem),
            id = +task.data('id'),
            checked = !!checkbox.filter(':checked').length;
        this.setModel(id, {
            done: checked
        });
        if ( checked ) {
            task.addClass(this.config.classes.completed);
            this.setModel(id, {
                done: checked,
                finish: new Date().toISOString()
            });
        }
        else {
            task.removeClass(this.config.classes.completed);
            this.setModel(id, {
                done: checked,
                finish: null
            });
        }
    }, this);

    this.els.add._on('click', function(event){
        var taskElement = $(event.currentTarget).parents(this.config.settings.listItem),
            parentElement = taskElement.parents(this.config.settings.listItem),
            id = +taskElement.data('id'),
            parent = +parentElement.data('id'),
            newTaskId = +new Date(),
            newTaskData = {
                id: newTaskId,
                text: 'Задача',
                start: new Date().toISOString(),
                finish: null,
                done: false,
                parent: parent,
                order: null
            },
            newTaskHtml = _.template(this.config.templates.listItem, newTaskData),
            newTaskElement = $(newTaskHtml);
        taskElement.after(newTaskElement);
        this.setModel(newTaskId, newTaskData);
    }, this);
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
