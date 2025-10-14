import { createPrefixEncoder } from 'prefix-encoder';

function escape(str: string) {
    let res = '';
    for (let char of str) {
        if (char === '_' || char === '.') {
            res += '_';
        }
        res += char;
    }
    return res;
}

// Create an encoder for encoding and decoding reference paths
// 创建一个用于编码和解码引用路径的编码器
const referencePathEncoder = createPrefixEncoder<string[]>({
    prefix: '$ref',
    escapeCharacter: '_',
    stringify: (paths) => {
        let str = '';
        let first = true;
        for (let path of paths) {
            // The first character can be any character
            // 第 1 个字符可为任意字符
            str += first ? ':' : '.';
            first = false;
            str += escape(path);
        }
        return str;
    },
    parse: (string) => {
        const paths: string[] = [];
        if (string.length > 0) {
            let path = '';
            let pushPath = false;
            string = string.slice(1);
            for (let i = 0; i < string.length; i++) {
                let char = string[i];
                if (char === '.') {
                    paths.push(path);
                    path = '';
                    pushPath = false;
                    continue;
                } else if (char === '_') {
                    ++i;
                    char = string[i] || '_';
                }
                path += char;
                pushPath = true;
            }
            if (pushPath) {
                paths.push(path);
            }
        }
        return paths;
    },
});

/**
 * Replace repeated references
 * 替换重复引用
 *
 * @description
 * Convert repeated references (including circular references) in the data structure to serializable reference paths.
 * 将数据结构中的重复引用（包括循环引用）转换为可序列化的引用路径。
 *
 * @note
 * - This function does not modify the original input data structure.
 *   本函数不会修改原始输入数据结构。
 *
 * - If there are no repeated references in the input, the input itself is returned.
 *   如果输入中不存在任何重复引用，则直接返回输入本身。
 *
 * - If a part of the input does not contain repeated references, the corresponding part in the returned structure will directly reference the original part rather than a copy.
 *   如果输入的某部分不包含重复引用，返回的结构中会直接引用原部分，而非副本。
 */
export function replaceReference<T = any>(data: T): T {
    // 存储值到路径的映射
    const valueToPathMap = new WeakMap<any, string[]>();

    // 存储原始值到新值的映射
    const valueToNewValue = new Map<any, any>();

    // 开始替换引用
    return replace(data, []);

    // 递归替换函数
    function replace(value: any, path: string[]) {
        // 如果值已经被处理过，直接返回缓存的新值
        if (valueToNewValue.has(value)) {
            return valueToNewValue.get(value);
        }

        // 设置并缓存新值
        function setNewValue(newValue: any) {
            valueToNewValue.set(value, newValue);
            return newValue;
        }

        // 如果值是字符串，进行编码处理
        if (typeof value === 'string') {
            return setNewValue(referencePathEncoder.encode(value));
        }

        // 如果值不是对象，直接返回
        if (Object(value) !== value) {
            return value;
        }

        // 如果值是对象, 检查是否已经存在路径
        const existingPath = valueToPathMap.get(value);
        // 如果已经存在, 说明之前被处理过
        if (existingPath) {
            valueToPathMap.delete(value);
            // 直接返回首次处理时的路径，并建立值与路径字符串的映射关系。第 3 次及以后将直接从缓存中取到编码后的字符串路径
            return setNewValue(referencePathEncoder.encode(existingPath));
        } else {
            // 将当前值和路径存储。后续该值被第 2 次处理时，直接返回路径
            // 现在不立即, 而是等到值被第 2 次处理时再进行序列化, 是为了避免不必要的计算
            valueToPathMap.set(value, path);
        }

        // 新的对象或数组
        let clone: any;
        // 是否包含引用
        let containsReference = false;
        if (Array.isArray(value)) {
            clone = [];
        } else if (Object.getPrototypeOf(value) === Object.prototype) {
            clone = {};
        } else {
            // 既非普通对象，也非数组的对象将被原样保留。
            clone = value;
        }

        if (clone !== value) {
            // 遍历键值对
            for (let [key, originalValue] of Object.entries(value)) {
                // 递归处理子值
                const newValue = replace(originalValue, path.concat(key));
                clone[key] = newValue;
                // 如果原始值与新值不同，表明存在引用
                if (originalValue !== newValue) {
                    containsReference = true;
                }
            }
        }

        // 如果包含引用，返回克隆的值，否则返回原值
        return containsReference ? clone : value;
    }
}

/**
 * Restore references relationships
 * 恢复引用关系
 *
 * @description
 * Restore reference relationships in the data structure by converting reference paths to actual object references.
 * 恢复数据结构中的引用关系，将引用路径转换为实际的对象引用。
 *
 * @note
 * This function directly modifies the input data structure.
 * 本函数会直接修改输入的数据结构。
 */
export function restoreReference<T = any>(data: T): T {
    // 用于存储值到引用值或缓存值的映射，用于恢复引用关系
    const valueToNewValue = new Map<any, any>();

    // 开始恢复引用
    return restore(data);

    // 递归恢复函数
    function restore(value: any) {
        // 恢复引用关系
        if (valueToNewValue.has(value)) {
            return valueToNewValue.get(value);
        }

        // 设置并缓存新值
        function setNewValue(newValue: any) {
            valueToNewValue.set(value, newValue);
            return newValue;
        }

        if (typeof value === 'string') {
            // 解码字符串，可能得到路径或原始字符串
            const strOrPath = referencePathEncoder.decode(value);
            // 本来就是字符串
            if (typeof strOrPath === 'string') {
                return setNewValue(strOrPath);
            } else {
                // 恢复路径获取引用值
                const refValue = getValueByPath(strOrPath);
                return setNewValue(refValue);
            }
        }

        if (Object(value) !== value) {
            return value;
        }

        for (let [key, originalValue] of Object.entries(value)) {
            // 递归处理子值
            const newValue = restore(originalValue);
            if (!Object.is(newValue, originalValue)) {
                value[key] = newValue;
            }
        }

        return setNewValue(value);
    }

    // 根据路径获取值
    function getValueByPath(path: string[]) {
        let current: any = data;
        for (let key of path) {
            current = current[key];
        }
        return current;
    }
}
