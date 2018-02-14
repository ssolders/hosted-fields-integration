// The paymentIQ mid you are using
var merchantId = "1000";
// List of fields to host
var fields = [];
// Url to the hosted fields - Needs to switched to production-url when deploying
var hostedfieldsurl = "https://test-hostedpages.paymentiq.io";
// Service
var service;
// External styles for hosted fields.
var styles = "{ height: 24px }";
// The hosted fields currently in play.
var targets = [];
// Responses gotten from the hosted fields.
var responses = [];
// Element to render the hosted fields on.
var el = "#hosted-fields-wrapper";
// Method to call when all responses from hosted fields has been fetched with postMessage
var callback;

var fieldTypes = {
  TEXT: 'TEXT',
  NUMBER: 'NUMBER',
  CVV: 'CVV',
  CREDITCARD_NUMBER: 'CREDITCARD_NUMBER',
  EXPIRY_MM_YYYY: 'EXPIRY_MM_YYYY'
}

var actions = {
    // Event is emitted when input is done.
    get: 'get',
    // Event is emitted when the iframe is created and the content will be rendered.
    setupContent: 'setupContent',
    // Received when with the hosted field data.
    formData: 'formData',
    // Recvied when enter was pressed in the hosted fields to submit the form.
    formSubmit: 'formSubmit'
}

function initHostedFields () {
  var window;
  if (document.parentWindow) {
    window = document.parentWindow
  } else {
    window = document.defaultView
  }

  var CARDNUMBER_FIELD = {
    type: fieldTypes.CREDITCARD_NUMBER,
    id: 'creditcard',
    name: 'creditcard',
    label: 'Credit card',
    error: 'Credit card number is invalid',
    helpKey: 'Credit card',
    visible: true,
    required: true
  }

  var CVV_FIELD = {
    type: fieldTypes.CVV,
    id: 'cvv',
    name: 'cvv',
    label: 'CVV',
    error: 'CVV is invalid',
    helpKey: 'CVV',
    visible: true,
    required: true
  }

  setup({
    fields: [ CARDNUMBER_FIELD, CVV_FIELD ],
    callback: preCallbackHandler
  })

}

function setup (config) {
    fields = config.fields;
    callback = config.callback;

    initIframes();
}

function get () {
    targets.forEach((target) => {
        target.target.postMessage({action: actions.get, merchantId: merchantId, id: target.id}, '*');
    })
}

function reset () {
  targets = []
}

function initIframes () {
    targets = targets.concat(fields.map((field) => {
        return initIframe(field)
    }))
}

function eventHandler ($event) {
    switch ($event.data.action) {
        case actions.formData:
            responses.push({ id: $event.data.id, data: $event.data.formData })
            sendCallback()
            break;
        case actions.formSubmit:
            get()
            break;
    }
}

function sendCallback () {
    var responseIds = responses.map((response) => response.id);
    var targetIds = targets.map((target) => target.id);
    if (responseIds.length !== targetIds.length) return;
    var includesAllIds = true;
    targetIds.forEach((targetId) => {
        includesAllIds = responseIds.includes(targetId);
    });

    // Check that we have gotten responses from all hosted fields.
    // Before sending the callback.
    if (includesAllIds) {
        var data = responses.reduce((formData, response) => {
          formData = { ...formData, ...response.data };
          return formData;
        }, {});
        // Reset the responses.
        responses = []
        callback()(data);
    }
}

function initIframe (field) {
    var iframe = document.createElement('iframe');
    iframe.id = 'hosted-field-' + field.id;
    iframe.name = 'hosted-field-' + field.id;

    // This is hostedfieldsurl
    iframe.src = hostedfieldsurl + '?mid=' + merchantId;
    var container = document.querySelector(el);

    var iframeContainerEl = document.createElement('div');
    iframeContainerEl.id = 'hosted-field-container-' + field.id
    iframeContainerEl.className = 'hosted-field-container'
    iframeContainerEl.appendChild(iframe)

    container.appendChild(iframeContainerEl);

    // Get the target window...
    var target = document.querySelector('#'+iframe.id).contentWindow;
    // Attach onload event listener to iframe so we can send the
    // setupContent event when iframe is fully loaded.
    iframe.onload = createIframeProxy.bind(this, field, target)
    return {
        id: iframe.id, target
    }
}

function createIframeProxy (field, target) {
    var fields = {};
    fields[field.name] = field;
    window.addEventListener("message", eventHandler, false)
    target.postMessage({
        action: actions.setupContent,
        styles: styles,
        fields: fields,
        service: service
    }, '*');
}

function preCallbackHandler (formData) {
  // perhaps you want to validate some here?
  return callbackHandler
}

function callbackHandler (formData) {
  console.log(formData)
}
