function request(mode, url, token, data) {
    return new Promise(function(resolve) {
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.onreadystatechange = function() {
            if (this.readyState == 4) {
                try {
                    const result = JSON.parse(this.responseText);
                    resolve(result);
                } catch() {
                    resolve(); // When offline
                }
            }
        };
        xmlhttp.open(mode, url);
        if (token) {
            xmlhttp.setRequestHeader('x-access-token', token);
        }
        if (mode === 'POST') {
            xmlhttp.setRequestHeader('Content-Type', 'application/json');
            xmlhttp.send(JSON.stringify(data));
        } else {
            xmlhttp.send();
        }
    });
}

function get(url, token) {
    return request('GET', url, token);
}

function del(url, token) {
    return request('DELETE', url, token);
}

function post(url, token, data) {
    return request('POST', url, token, data);
}