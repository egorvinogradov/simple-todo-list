var Model;

Model = function(params){
    this._params = params;
    this._initial = [];
    this._current = [];
    this._events = {
        change: null,
        revert: null
    };
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

Model.prototype._copy = function(arr){
    var copy = [];
    for ( var i = 0, l = arr.length; i < l; i++ ) {
        var value = arr[i];
        value instanceof Object
            ? copy.push(_.clone(value))
            : copy.push(value);
    }
    return copy;
};

Model.prototype.on = function(event, handler, context){
    this._events[event] = $.proxy(handler, context);
};

Model.prototype.set = function(id, params){
    var item = this.get(id),
        changes = {};
    if ( !item ) {
        item = {};
        this._current.push(item);
    }
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

Model.prototype.toArray = function(){
    return this._copy(this._current);
};

Model.prototype.revert = function(){
    if ( !this._equals(this._current, this._initial) ) {
        this._current = this._copy(this._initial);
        if ( this._events.revert ) {
            this._events.revert();
        }
    }
};

/*

// todo: uncomment when back-end will be done

Model.prototype.fetch = function(callbacks){
    $.ajax({
        url: this._params.url,
        complete: function(response){
            if ( response.status === 200 ) {
                var data = $.parseJSON(response.responseText);
                if ( data ) {
                    this._initial = this._copy(data);
                    this._current = this._copy(data);
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
        data: this._current,
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

*/

Model.prototype.fetch = function(callbacks){
    var data = JSON.parse(localStorage.getItem('tasks')) || [];
    this._initial = this._copy(data);
    this._current = this._copy(data);
    callbacks.success(data);
};

Model.prototype.save = function(callbacks){
    localStorage.setItem('tasks', JSON.stringify(this._current));
    callbacks.success();
};


Model.prototype.sync = function(){
    // navigator.onLine
    // todo: sync when offline
};
