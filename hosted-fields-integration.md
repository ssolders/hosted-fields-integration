### Hosted-fields integration

hosted-fields communicates using window.postMessage to setup fields, get field content and validate.
Starting of, you need to create an iframe-element for every field you wish to have. Lets define a field-object:

````javascript
var CARDNUMBER_FIELD = {
    type: 'CREDITCARD_NUMBER',
    id: 'creditcard',
    name: 'creditcard',
    label: 'Credit card',
    error: 'Credit card number is invalid',
    helpKey: 'Credit card',
    visible: true,
    required: true
  }
````    

For every field you define you can run the following init-function that creates an iframe-element, gives it an id, name, class and appends it to a div. Then appends that div to a dom-node in your index-html that you've specified.

````javascript
function initIframe (field) {
    var iframe = document.createElement('iframe');
    iframe.id = 'hosted-field-' + field.id;
    iframe.name = 'hosted-field-' + field.id;

    // This is hostedfieldsurl
    iframe.src = hostedfieldsurl + '?mid=' + merchantId;
    var container = document.querySelector('#hosted-fields-wrapper');

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
````

It also binds a function to the iframe's onload-event - **createIframeProxy()**

````javascript
function createIframeProxy (field, target) {
    var fields = {};
    fields[field.name] = field;
    window.addEventListener("message", eventHandler, false)
    target.postMessage({
        action: 'setupContent',
        styles: styles,
        fields: fields,
        service: service
    }, '*');
}
````

This function will register an eventListener for postMessages received from the iframe so that we can catch it when **hosted-fields** are communicating.
We also send out a postMessage of our own to **hosted-fields** that it should init a new field for us.

The **eventHandler** passed into the eventListeners is pretty much just a router and should look like:

````javascript
function eventHandler ($event) {
    switch ($event.data.action) {
        case 'formdata':
            responses.push({ id: $event.data.id, data: $event.data.formData })
            sendCallback()
            break;
        case 'formSubmit':
            get()
            break;
    }
}
````

### Handle form submit & getting the form data

When submiting the form you need to run a postMessage for each of your fields:

````javascript
function get () {
    targets.forEach((target) => {
        target.target.postMessage({action: 'get', merchantId: 'yourMerchantId', id: target.id}, '*');
    })
}
````

This will trigger **hosted-fields** to send back a postMessage.
This postMessage will be handled by your "eventHandler-method" that will direct it to a sendCallback()-function.

The function will loop through all your **targets** (your fields).
It will then merge all the field-values and pass it on as a parameter to the function your callback-handler is returning.

````javascript
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
````

## Callback handler
You need to define a global variable called **callback**. This needs to be a function that returns a function:

````
var callback = preCallbackHandler

function preCallbackHandler () {
    // perhaps perform some of your own validations
    return callbackHandler
}

function callbackHandler (formData) {
    console.log(formData)
}
````




