export default (function(params) {
    let _events={}
    return {
        emit(eventName, data) {
            if (!_events[eventName]) {
                return;
            }
            _events[eventName].forEach((listener) => listener(data));
        },
        on(eventName, listener) {
            if (!_events[eventName]) {
                _events[eventName] = [];
            }
            _events[eventName].push(listener);
        }
    }
})()