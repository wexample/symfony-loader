export function toType(a): string {
  // Get fine type (object, array, function, null, error, date ...)
  return {}.toString.call(a).match(/([a-z]+)(:?\])/i)[1];
}

export function isDeepObject(obj): boolean {
  return 'Object' === toType(obj);
}

export function deepAssign(...args: any[]): any {
  return deepAssignWithOptions({
    nonEnum: true,
    symbols: true,
    descriptors: true,
    proto: true,
  }).apply(this, arguments);
}

/**
 * Deep assign implementation. Quite arbitrary choice as there is a lot of different version.
 * This one seems pretty configurable.
 *
 * @see https://stackoverflow.com/a/48579540
 * @param options
 * @returns {function(*=, ...[*]): *}
 */
export function deepAssignWithOptions(options) {
  return (target, ...sources) => {
    sources.forEach((source) => {
      if (!isDeepObject(source) || !isDeepObject(target)) return;

      // Copy source's own properties into target's own properties
      let copyProperty = (property) => {
        const descriptor = Object.getOwnPropertyDescriptor(source, property);
        //default: omit non-enumerable properties
        if (descriptor.enumerable || options.nonEnum) {
          // Copy in-depth first
          if (isDeepObject(source[property]) && isDeepObject(target[property]))
            descriptor.value = deepAssignWithOptions(options)(
              target[property],
              source[property]
            );
          //default: omit descriptors
          if (options.descriptors)
            Object.defineProperty(target, property, descriptor);
          // shallow copy descriptor
          else target[property] = descriptor.value; // shallow copy value only
        }
      };

      // Copy string-keyed properties
      Object.getOwnPropertyNames(source).forEach(copyProperty);

      //default: omit symbol-keyed properties
      if (options.symbols)
        Object.getOwnPropertySymbols(source).forEach(copyProperty);

      //default: omit prototype's own properties
      if (options.proto)
        // Copy source prototype's own properties into target prototype's own properties
        deepAssignWithOptions(Object.assign({}, options, {proto: false}))(
          // Prevent deeper copy of the prototype chain
          Object.getPrototypeOf(target),
          Object.getPrototypeOf(source)
        );
    });
    return target;
  };
}

export function callPrototypeMethodIfExists(self, methodName: string, args = {}) {
  const method = Object.getPrototypeOf(self)[methodName];

  if (method) {
    return method.apply(self, args);
  }

  return undefined;
}

export function getItemByPath(
  data: any,
  key: string | string[],
  defaultValue: any = null,
  separator: string = '.'
): any {
  let keys: string[];

  if (typeof key === 'string') {
    keys = key.split(separator);
  } else {
    keys = key;
  }

  for (const k of keys) {
    if (
      data !== null &&
      typeof data === 'object' &&
      k in data
    ) {
      data = data[k];
    } else {
      return defaultValue;
    }
  }

  return data;
}
