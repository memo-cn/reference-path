# reference-path <a href="https://www.npmjs.com/package/reference-path"><img src="https://img.shields.io/npm/v/reference-path.svg" /></a>

[English](https://github.com/memo-cn/reference-path/blob/main/README.md) | [简体中文](https://github.com/memo-cn/reference-path/blob/main/README.zh-CN.md)

Transform repeated references (including circular references) in JavaScript object structures into dot-separated path strings, ensuring objects can precisely retain and restore their original reference relationships after serialization and deserialization.

## Scenarios

When handling complex object structures, you may encounter the following two types of reference issues:

- **Circular references**: Refer to a situation where an object directly or indirectly references itself, for example:

```js
  var a = {};
  a.self = a;
```

This will cause `JSON.stringify(a)` to throw an error, such as `TypeError: Converting circular structure to JSON` or `cyclic object value`.

- **Repeated references**: Refer to a situation where the same object instance is referenced in multiple locations, for example:

```js
  var a = { hello: "world" };
  var b = [a, a];
```

Although `JSON.stringify(b)` can execute normally, the serialized result will lose the original reference relationships, causing each position to become an independent copy after deserialization.

## Methods

`reference-path` provides a set of methods for replacing and restoring repeated references in JavaScript objects.

| Method             | Type             | Description                                                                             |
| ------------------ | ---------------- | --------------------------------------------------------------------------------------- |
| `replaceReference` | (object: T) => T | Transforms repeated references in the object structure into dot-separated path strings. |
| `restoreReference` | (object: T) => T | Replaces reference paths in the object structure and restores reference relationships.  |

When calling `replaceReference` to transform references:

- The input data structure will not be modified.
- If the input object structure does not contain repeated references, the input itself will be returned.
- If certain parts of the input do not contain repeated references, the returned data structure will directly reference those parts instead of creating copies.

When calling `restoreReference` to restore references:

- Returns the input object.
- If the input object contains reference paths, the corresponding data structure will be directly modified to restore reference relationships; if not, it will remain unchanged.

## Examples

Below is an example of an object structure containing circular references:

```ts
// Define the structure
var html = { name: 'html' };
var head = { name: 'head' };
var body = { name: 'body' };

// Set up references
head.parent = html;
body.parent = html;

head.next = body;
body.prev = head;

html.children = [head, body];

// Throws an error: TypeError: Converting circular structure to JSON
JSON.stringify(html);

import { replaceReference } from 'reference-path';
// Transform circular references, returning new objects that can be serialized.
var serializableObject = replaceReference(html);
```

After calling `replaceReference`, repeated references are replaced with string-formatted reference paths.

```js
var json = JSON.stringify(serializableObject);
console.log(json);
// Output:
{
    "name": "html",
    "children": [
        {
            "name": "head",
            "parent": "$ref:",
            "next": {
                "name": "body",
                "parent": "$ref:",
                "prev": "$ref:children.0"
            }
        },
        "$ref:children.0.next"
    ]
}
```

> The reference path is composed of the various levels of properties traversed from the root object to the target object. These properties are separated by dot characters, and the path begins with a fixed prefix of `$ref:` to distinguish it from ordinary strings.
> <br/><br/>
> In the above example, `$ref:children.0.next` is a reference path, which represents the object pointed to by the `next` property of the element with an index of `0` in the array corresponding to the `children` property of the root object.

Use `restoreReference` to restore reference relationships:

```ts
import { restoreReference } from 'reference-path';

// New object with restored reference relationship
var restoredObject = restoreReference(serializableObject);
// true
console.log(restoredObject.children[0].next === restoredObject.children[1]);
```

## License

[MIT](./LICENSE)
