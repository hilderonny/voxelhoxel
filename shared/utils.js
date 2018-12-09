function _c(tagName) {
  return document.createElement(tagName);
}

function _g(selector) {
  return document.querySelector(selector);
}

function getRequestParameters() {
  const params = {};
  location.search.substr(1).split("&").forEach(function (item) {
    const p = item.split('=');
    if (p[0]) params[p[0]] = p[1];
  });
  return params;
}

var _lp = getRequestParameters;

function emit(name, data) {
  document.dispatchEvent(new CustomEvent(name, { detail: data }));
}
