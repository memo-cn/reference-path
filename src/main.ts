import { replaceReference, restoreReference } from '../lib';

referenceDemo();

async function referenceDemo() {
    var html = { name: 'html' };
    var head = { name: 'head' };
    var body = { name: 'body' };
    // head[''] = html;
    // html[''] = body;

    head.parent = html;
    body.parent = html;

    head.next = body;
    body.prev = head;

    html.children = [head, body];

    // TypeError: Converting circular structure to JSON
    // JSON.stringify(html);

    var serializableObject = replaceReference(html);
    var json = JSON.stringify(serializableObject, null, 4);
    console.log(json);

    var restoredObject = restoreReference(serializableObject);
    // true
    console.log(restoredObject.children[0].next === restoredObject.children[1]);
}
