$.fn.extend({
    _on: function(eventName, handler, context){
        this.on(eventName, $.proxy(handler, context));
    },
    _live: function(eventName, handler, context){
        this.live(eventName, $.proxy(handler, context));
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
        text: '.b-list-item__text'
    },
    classes: {
        completed: 'b-list-item_checked',
        hover: 'b-list-item_hover'
    },
    templates: {
        list: $('#list-template').html(),
        listItem: $('#list-item-template').html()
    },
    url: '/api/tasks/',
    newTaskText: 'Новая задача'
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

//localStorage.setItem('tasks', JSON.stringify(mock));

var Todo = new App(Config);
