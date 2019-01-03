function request(mode, url, data) {
    return new Promise(function(resolve) {
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.onreadystatechange = function() {
            if (this.readyState == 4) {
                const result = JSON.parse(this.responseText);
                resolve(result);
            }
        };
        xmlhttp.open(mode, url);
        if (mode === 'POST') {
            xmlhttp.setRequestHeader('Content-Type', 'application/json');
            xmlhttp.send(JSON.stringify(data));
        } else {
            xmlhttp.send();
        }
    });
}

function get(url) {
    return request('GET', url);
}

function post(url, data) {
    return request('POST', url, data);
}