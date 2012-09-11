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

Model.prototype.toArray = function(){
    return this._current.slice();
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
    return;

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
    // todo: sync when offline
};
