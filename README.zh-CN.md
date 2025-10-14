# 引用路径（Reference Path）<a href="https://www.npmjs.com/package/reference-path"><img src="https://img.shields.io/npm/v/reference-path.svg" /></a>

[English](https://github.com/memo-cn/reference-path/blob/main/README.md) | [简体中文](https://github.com/memo-cn/reference-path/blob/main/README.zh-CN.md)

将 JavaScript 对象结构中重复出现的引用（包括循环引用）转换为以点分隔的路径字符串，确保对象经序列化与反序列化后，可精确保留并恢复原始引用关系。

## 场景

在处理复杂的对象结构时，可能会遇到以下两类引用问题:

- **循环引用**: 指一个对象直接或间接地引用了自身，例如:

```js
  var a = {};
  a.self = a;
```

这种情况会导致 `JSON.stringify(a)` 抛出错误，例如 `TypeError: Converting circular structure to JSON` 或 `cyclic object value` 。

- **重复引用**: 指同一个对象实例被多个位置引用，例如:

```js
  var a = { hello: "world" };
  var b = [a, a];
```

虽然 `JSON.stringify(b)` 可以正常执行，但序列化后的结果会丢失原本的引用关系，导致反序列化后每个位置都会变成独立的拷贝。

## 方法

`reference-path` 提供了一组方法，用于替换和恢复 JavaScript 对象中的重复引用。

| 方法               | 类型             | 作用                                                   |
| ------------------ | ---------------- | ------------------------------------------------------ |
| `replaceReference` | (object: T) => T | 将对象结构中重复出现的引用转换为以点分隔的路径字符串。 |
| `restoreReference` | (object: T) => T | 替换对象结构中的引用路径，恢复引用关系。               |

调用 `replaceReference` 转换引用时:

- 入参的数据结构不会被修改。
- 若输入的对象结构中不存在重复引用，则直接返回入参本身。
- 若入参的某部分不包含重复引用，返回的数据结构会直接引用入参中对应的部分，而不是其副本。

调用 `restoreReference` 恢复引用时:

- 返回输入的对象。
- 若入参对象中包含引用路径，对应的数据结构会被直接修改以恢复引用关系；若不包含，则保持原样。

## 示例

以下是一个包含循环引用的数据结构示例:

```ts
// 定义结构
var html = { name: 'html' };
var head = { name: 'head' };
var body = { name: 'body' };

// 设置引用关系
head.parent = html;
body.parent = html;

head.next = body;
body.prev = head;

html.children = [head, body];

// 报错 TypeError: Converting circular structure to JSON
JSON.stringify(html);

import { replaceReference } from 'reference-path';
// 转换循环引用，返回可正常序列化的新对象
var serializableObject = replaceReference(html);
```

调用 `replaceReference` 后，重复引用被替换为了字符串格式的引用路径。

```js
var json = JSON.stringify(serializableObject);
console.log(json);
// 输出:
{
    "name": "html",
    "children": [
        {
            "name": "head",
            "parent": "$ref",
            "next": {
                "name": "body",
                "parent": "$ref",
                "prev": "$ref:children.0"
            }
        },
        "$ref:children.0.next"
    ]
}
```

> 引用路径由从根对象到目标对象经过的各级属性组成，属性之间用英文点号分隔，并以固定的 `$ref:` 前缀开头，以便与普通字符串区分。
> <br/><br/>
> 在上面的示例中，`$ref:children.0.next` 就是一个引用路径，表示根对象的 `children` 属性对应的数组中，索引为 `0` 的元素的 `next` 属性所指向的对象。

使用 `restoreReference` 恢复引用关系:

```ts
import { restoreReference } from 'reference-path';

// 恢复了引用关系的新对象
var restoredObject = restoreReference(serializableObject);
// true
console.log(restoredObject.children[0].next === restoredObject.children[1]);
```

## 许可

[MIT](./LICENSE)
