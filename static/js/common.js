$.fn.extend({
    _on: function(eventName, handler, context){
        return this.on(eventName, $.proxy(handler, context));
    },
    _live: function(eventName, handler, context){
        return this.live(eventName, $.proxy(handler, context));
    }
});

var Config = {
    selectors: {
        body: '.b-main',
        container: '.b-tasks',
        list: '.b-list',
        listItem: '.b-list-item',
        add: '.b-list-item__add',
        checkbox: '.b-list-item__checkbox',
        text: '.b-list-item__text',
        wrapper: '.b-list-item__wrapper'
    },
    classes: {
        //active: 'b-list-item_active',
        focused: 'b-list-item_focused',
        selected: 'b-list-item_selected'
    },
    templates: {
        list: $('#list-template').html(),
        listItem: $('#list-item-template').html()
    },
    url: '/api/tasks/',
    newTaskText: 'Новая задача'
};

var Todo = new App(Config);
