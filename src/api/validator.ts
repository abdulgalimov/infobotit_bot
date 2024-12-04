function validateCallto(data: object, key: string) {
  if (typeof data !== 'object') {
    throw new Error(`${key} must be object`);
  }
}

export function validateNotificationTitles(data: object) {
  for (const key in data) {
    if (isNaN(+key)) {
      throw new Error('invalid key');
    }

    const value = data[key];

    if (typeof value !== 'object') {
      throw new Error('value must be object');
    }

    const keys = Object.keys(value);
    if (!keys.length) {
      throw new Error('value must contain callto1 or callto2');
    }

    keys.forEach((k) => {
      if (k !== 'callto1' && k !== 'callto2') {
        throw new Error('value must contain callto1 or callto2 only');
      }
    });

    if (value.callto1) {
      validateCallto(value.callto1, 'callto1');
    }

    if (value.callto2) {
      validateCallto(value.callto2, 'callto2');
    }
  }
}
