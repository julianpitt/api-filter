import { pathToRegexp } from 'path-to-regexp';

export class ResponseFilter {
  private errorOnMissingKey: boolean;
  private filters: Record<string, { path: string; regex: RegExp; filterRules: string[] }[]> = {};

  constructor(config = { errorOnMissingKey: false }) {
    this.errorOnMissingKey = config.errorOnMissingKey;
  }

  addFilter(method: string, path: string, filterRules: string[]) {
    this.filters[method] = this.filters[method] || [];
    this.filters[method].push({ path, filterRules, regex: pathToRegexp(path) });
  }

  findMatchingPath(method: string, path: string): undefined | string[] {
    // there are no filters for the matching method
    if (!this.filters[method]) return undefined;

    // itterate through all the path rules for the given http method
    for (let i = 0; i < this.filters[method].length; i++) {
      const currentPathRule = this.filters[method][i];
      // there's a match
      if (currentPathRule.regex.exec(path)) {
        return currentPathRule.filterRules;
      }
    }

    // there's no match
    return undefined;
  }

  filterResult(method: string, path: string, inputRecord: Record<string, any>) {
    const errorOnMissingKey = this.errorOnMissingKey;

    const matchedPathRules = this.findMatchingPath(method, path);
    if (!matchedPathRules) return inputRecord;

    // filter rules found
    return matchedPathRules.reduce((inputRecordAccum, filterString: string) => {
      const referencesToRemove: Record<any, any>[] = [];
      const overallKeys = filterString.split('.');
      const keyToRemove = overallKeys[overallKeys.length - 1];

      function getPropertyReference(inputRecordAccum: Record<string, any>, keys: string[]) {
        let lastObject = inputRecordAccum;

        for (let index = 0; index < keys.length - 1; index++) {
          let keyPart = keys[index];

          // Array of objects
          if (keyPart === '[]') {
            if (Array.isArray(lastObject)) {
              lastObject.forEach((obj: any[]) => getPropertyReference(obj, keys.slice(index + 1)));
            } else if (errorOnMissingKey) {
              throw new Error(
                `Invalid filter path "${filterString}". Failed to find array at "${
                  keys[index - 1]
                }".`,
              );
            }
            return;
          } else {
            // We're filtering array results
            if (keyPart.indexOf('[') > -1) {
              keyPart = keyPart.substring(0, keyToRemove.indexOf('['));
            }

            if (lastObject[keyPart] === undefined && errorOnMissingKey) {
              throw new Error(
                `Invalid filter path "${filterString}". Failed to find object at "${keyPart}".\nValid keys are:\n - ${Object.keys(
                  lastObject,
                ).join('\n - ')}`,
              );
            }

            lastObject = lastObject[keyPart];
          }
        }

        let removalKey =
          keyToRemove.indexOf('[') > -1
            ? keyToRemove.substring(0, keyToRemove.indexOf('['))
            : keyToRemove;

        if (lastObject !== undefined && lastObject[removalKey] !== undefined) {
          referencesToRemove.push(lastObject);
        } else if (errorOnMissingKey) {
          throw new Error(
            `Invalid filter path "${filterString}". Failed to find object to remove at "${removalKey}".\nValid keys are:\n - ${Object.keys(
              lastObject,
            ).join('\n - ')}`,
          );
        }
      }

      getPropertyReference(inputRecordAccum, overallKeys);

      referencesToRemove.forEach(parentObjectRef => {
        if (keyToRemove.indexOf('[') > -1) {
          // deleting values from an array
          const objectKey = keyToRemove.substring(0, keyToRemove.indexOf('['));
          const removeValues = keyToRemove.substring(
            keyToRemove.indexOf('[') + 1,
            keyToRemove.length - 1,
          );
          const removeValuesArray = removeValues.split(',');
          parentObjectRef[objectKey] = parentObjectRef[objectKey].filter(
            (value: string | number) => !removeValuesArray.includes(`${value}`),
          );
        } else {
          // deleting a key
          delete parentObjectRef[keyToRemove];
        }
      });

      return inputRecordAccum;
    }, inputRecord);
  }
}
