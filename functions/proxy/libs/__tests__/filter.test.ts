import { ResponseFilter } from '../filter';

describe('filter', () => {
  it('should remove top level properties', () => {
    const input = {
      hello: 'world',
      removeMe: 'hi',
      andRemoveMe: 'hi',
      name: 'Julian',
    };
    const expected = {
      hello: 'world',
      name: 'Julian',
    };
    const filter = new ResponseFilter();

    filter.addFilter('GET', '/', ['removeMe', 'andRemoveMe']);
    const output = filter.filterResult('GET', '/', input);

    expect(output).toStrictEqual(expected);
  });

  it('should remove nested level properties', () => {
    const input = {
      hello: 'world',
      nested: {
        removeMe: 'hi',
        andRemoveMe: 'hi',
      },
      remove: 'hi',
      name: 'Julian',
    };
    const expected = {
      hello: 'world',
      name: 'Julian',
      nested: {},
    };
    const filter = new ResponseFilter();

    filter.addFilter('GET', '/', ['nested.removeMe', 'nested.andRemoveMe', 'remove']);
    const output = filter.filterResult('GET', '/', input);

    expect(output).toStrictEqual(expected);
  });

  it('should remove array values', () => {
    const input = {
      hello: 'world',
      nested: ['hello', 'julian', 'james', 'world'],
    };
    const expected = {
      hello: 'world',
      nested: ['hello', 'world'],
    };
    const filter = new ResponseFilter();

    filter.addFilter('GET', '/', ['nested[julian,james]']);
    const output = filter.filterResult('GET', '/', input);

    expect(output).toStrictEqual(expected);
  });

  it('should remove array values on deep properties', () => {
    const input = {
      hello: 'world',
      details: {
        nested: ['hello', 'julian', 'james', 'world'],
      },
    };
    const expected = {
      hello: 'world',
      details: {
        nested: ['hello', 'world'],
      },
    };
    const filter = new ResponseFilter();

    filter.addFilter('GET', '/', ['details.nested[julian,james]']);
    const output = filter.filterResult('GET', '/', input);

    expect(output).toStrictEqual(expected);
  });

  it('should remove array values on nested level properties in collections', () => {
    const input = {
      hello: 'world',
      details: [
        {
          name: 'hello',
          nested: ['hello', 'julian', 'james', 'world'],
        },
        {
          name: 'world',
          nested: ['hello', 'julian', 'world'],
        },
      ],
    };
    const expected = {
      hello: 'world',
      details: [
        {
          name: 'hello',
          nested: ['hello', 'world'],
        },
        {
          name: 'world',
          nested: ['hello', 'world'],
        },
      ],
    };
    const filter = new ResponseFilter();

    filter.addFilter('GET', '/', ['details.[].nested[julian,james]']);
    const output = filter.filterResult('GET', '/', input);

    expect(output).toStrictEqual(expected);
  });

  it('should remove nested level properties in collections', () => {
    const input = {
      hello: 'world',
      nested: [
        {
          name: 'Julian',
          remove: 'me',
        },
        {
          name: 'Matt',
          remove: 'me',
          andMe: 'hi',
        },
      ],
    };
    const expected = {
      hello: 'world',
      nested: [
        {
          name: 'Julian',
        },
        {
          name: 'Matt',
        },
      ],
    };
    const filter = new ResponseFilter();

    filter.addFilter('GET', '/', ['nested.[].remove', 'nested.[].andMe']);
    const output = filter.filterResult('GET', '/', input);

    expect(output).toStrictEqual(expected);
  });

  it('should not error if there is a missing key in the path', () => {
    const input = {
      hello: 'world',
      nested: {
        name: 'Julian',
        remove: 'me',
      },
    };
    const filter = new ResponseFilter();

    filter.addFilter('GET', '/', ['nested.undef.remove']);

    expect(() => {
      filter.filterResult('GET', '/', input);
    }).not.toThrowError();
  });

  it('should not error if there is a missing array in the path', () => {
    const input = {
      hello: 'world',
      nested: {
        name: 'Julian',
        remove: 'me',
      },
    };
    const filter = new ResponseFilter();

    filter.addFilter('GET', '/', ['nested.[].remove']);

    expect(() => {
      filter.filterResult('GET', '/', input);
    }).not.toThrowError();
  });

  it('should not error if there is a missing key in the end path', () => {
    const input = {
      hello: 'world',
    };
    const filter = new ResponseFilter({ errorOnMissingKey: false });

    filter.addFilter('GET', '/', ['hello.world']);

    expect(() => {
      filter.filterResult('GET', '/', input);
    }).not.toThrowError();
  });

  it('should error if there is a missing key in the path', () => {
    const input = {
      hello: 'world',
      nested: {
        name: 'Julian',
        remove: 'me',
      },
    };
    const filter = new ResponseFilter({ errorOnMissingKey: true });

    filter.addFilter('GET', '/', ['nested.undef.remove']);

    expect(() => {
      filter.filterResult('GET', '/', input);
    }).toThrowError();
  });

  it('should error if there is a missing array in the path', () => {
    const input = {
      hello: 'world',
      nested: {
        name: 'Julian',
        remove: 'me',
      },
    };
    const filter = new ResponseFilter({ errorOnMissingKey: true });

    filter.addFilter('GET', '/', ['nested.[].remove']);

    expect(() => {
      filter.filterResult('GET', '/', input);
    }).toThrowError();
  });

  it('should error if there is a missing key in the end path', () => {
    const input = {
      hello: 'world',
    };
    const filter = new ResponseFilter({ errorOnMissingKey: true });

    filter.addFilter('GET', '/', ['hello.world']);

    expect(() => {
      filter.filterResult('GET', '/', input);
    }).toThrowError();
  });

  it('should remove nested level properties in objects inside of a collection', () => {
    const input = {
      hello: 'world',
      nested: [
        {
          name: 'Julian',
          properties: {
            house: 'big',
            car: 'blue',
          },
          remove: 'me',
        },
        {
          name: 'Matt',
          remove: 'me',
          properties: {
            house: 'big',
            car: 'grey',
          },
          andMe: 'hi',
        },
      ],
    };
    const expected = {
      hello: 'world',
      nested: [
        {
          name: 'Julian',
          properties: {
            car: 'blue',
          },
          remove: 'me',
        },
        {
          name: 'Matt',
          remove: 'me',
          properties: {
            car: 'grey',
          },
          andMe: 'hi',
        },
      ],
    };
    const filter = new ResponseFilter();

    filter.addFilter('GET', '/', ['nested.[].properties.house']);
    const output = filter.filterResult('GET', '/', input);

    expect(output).toStrictEqual(expected);
  });

  it('should remove multiple nested level properties in objects inside of a collection', () => {
    const input = {
      hello: 'world',
      nested: [
        {
          name: 'Julian',
          properties: {
            house: 'big',
            car: 'blue',
          },
          remove: 'me',
        },
        {
          name: 'Matt',
          remove: 'me',
          properties: {
            house: 'big',
            car: 'grey',
          },
          andMe: 'hi',
        },
      ],
    };
    const expected = {
      hello: 'world',
      nested: [
        {
          properties: {
            car: 'blue',
          },
          remove: 'me',
        },
        {
          remove: 'me',
          properties: {
            car: 'grey',
          },
          andMe: 'hi',
        },
      ],
    };
    const filter = new ResponseFilter();

    filter.addFilter('GET', '/', ['nested.[].properties.house', 'nested.[].name']);
    const output = filter.filterResult('GET', '/', input);

    expect(output).toStrictEqual(expected);
  });
});
