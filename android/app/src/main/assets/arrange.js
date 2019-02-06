function Arrange(baseurl = '') {

    const _currentuser = {
        _id: undefined,
        password: undefined,
        username: undefined,
        token: undefined
    }

    async function _del(url) {
        return _request('DELETE', url);
    }
    async function _get(url) {
        return _request('GET', url);
    }
    function _handleloginregister(username, password, response) {
        if (response) {
            _currentuser.password = password;
            _currentuser.username = username;
            _currentuser._id = response._id;
            _currentuser.token = response.token;
            return response;
        }
        return false;
    }
    async function _post(url, data) {
        return _request('POST', url, data);
    }
    async function _request(mode, url, data) {
        return new Promise(function(resolve) {
            var xmlhttp = new XMLHttpRequest();
            xmlhttp.onreadystatechange = async function() {
                if (this.readyState == 4) {
                    const result = this.responseText ? JSON.parse(this.responseText) : undefined;
                    // Token expired, relogin and try again
                    if (this.status === 401 && result.error === 'Token cannot be validated') {
                        const loggedin = await _login(_currentuser.username, _currentuser.password);
                        if (loggedin) {
                            const result2 = await _request(mode, url, data);
                            resolve(result2);
                        } else {
                            resolve(undefined); // Read failed again even after relogin
                        }
                    } else {
                        resolve(result);
                    }
                }
            };
            xmlhttp.open(mode, baseurl + url);
            if (_currentuser.token) {
                xmlhttp.setRequestHeader('x-access-token', _currentuser.token);
            }
            if (mode === 'POST' && data) {
                xmlhttp.setRequestHeader('Content-Type', 'application/json');
                xmlhttp.send(JSON.stringify(data));
            } else {
                xmlhttp.send();
            }
        });
    }

    async function _addreadableby(tablename, entityid, userid) {
        return _post('/api/arrange/addreadableby/' + tablename + '/' + entityid, { userid: userid });
    }
    async function _addwritableby(tablename, entityid, userid) {
        return _post('/api/arrange/addwritableby/' + tablename + '/' + entityid, { userid: userid });
    }
    async function _delete(tablename, entityid) {
        return _del('/api/arrange/delete/' + tablename + '/' + entityid);
    }
    async function _details(tablename, entityid, attributefilter) {
        return _post('/api/arrange/details/' + tablename + '/' + entityid, attributefilter);
    }
    async function _list(tablename, queryfilter) {
        return _post('/api/arrange/list/' + tablename, queryfilter);
    }
    async function _listusers() {
        return _get('/api/arrange/listusers');
    }
    async function _login(username, password) {
        const response = await _post('/api/arrange/login', { username: username, password: password });
        return _handleloginregister(username, password, response);
    }
    async function _register(username, password) {
        const response = await _post('/api/arrange/register', { username: username, password: password });
        return _handleloginregister(username, password, response);
    }
    async function _removereadableby(tablename, entityid, userid) {
        return _post('/api/arrange/removereadableby/' + tablename + '/' + entityid, { userid: userid });
    }
    async function _removewritableby(tablename, entityid, userid) {
        return _post('/api/arrange/removewritableby/' + tablename + '/' + entityid, { userid: userid });
    }
    async function _save(tablename, entity) {
        return _post('/api/arrange/save/' + tablename, entity);
    }
    async function _setpassword(newpassword) {
        return _post('/api/arrange/setpassword', { password: newpassword });
    }
    async function _setpubliclyreadable(tablename, entityid, readable) {
        return _post('/api/arrange/setpubliclyreadable/' + tablename + '/' + entityid + '/' + (readable ? 'true' : 'false'));
    }
    async function _setpubliclywritable(tablename, entityid, writable) {
        return _post('/api/arrange/setpubliclywritable/' + tablename + '/' + entityid + '/' + (writable ? 'true' : 'false'));
    }
    async function _transferownership(tablename, entityid, newuserid) {
        return _post('/api/arrange/transferownership/' + tablename + '/' + entityid + '/' + newuserid);
    }

    return {
        currentuser: _currentuser,
        addreadableby: _addreadableby,
        addwritableby: _addwritableby,
        delete: _delete,
        details: _details,
        list: _list,
        listusers: _listusers,
        login: _login,
        register: _register,
        removereadableby: _removereadableby,
        removewritableby: _removewritableby,
        save: _save,
        setpassword: _setpassword,
        setpubliclyreadable: _setpubliclyreadable,
        setpubliclywritable: _setpubliclywritable,
        transferownership: _transferownership
    }

}
