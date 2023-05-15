import util from 'util';
import format from 'pg-format';

const TYPE = {
  IS_NOT_NULL: Symbol('IS NOT NULL'),
};

function _getItem(key: string, value: any) {
  if (util.types.isRegExp(value)) {
    // node14 不兼容
    // return format('%I ~* %L', key, value.toString().replaceAll('/', ''))
    const newValue = value.toString().replace(/^\/|\/$/g, ''); // .replace(/\\\\/g,'').replace(/\\\//g,'/')
    if (key.includes('->')) {
      // "schema->>'title'"
      return format(`${key} ~* %L`, newValue);
    } else {
      return format(/\.|"/.test(key) ? '%s ~* %L' : '%I ~* %L', key, newValue);
    }
  }

  if (typeof value === 'boolean') {
    return format(`${key} = %s`, value.toString());
  }

  if (typeof value === 'string') {
    if (key.includes('->')) {
      return format(`${key} = %L`, value);
    } else if (['path @>', 'path <@'].includes(key)) {
      return format(`${key} %L`, value);
    } else if (value.includes('IS NOT NULL') && key === value) {
      return value;
    } else if (key.includes('<>')) {
      return format(`${key} %L`, value);
    } else if (key.includes('platform_cfg[')) {
      return format(`${key} = %L`, value);
    } else if (key.includes('created_at ')) {
      return format(`${key} %L`, value);
    } else {
      return format(/\.|"/.test(key) ? '%s = %L' : '%I = %L', key, value);
    }
  }

  if (typeof value === 'object') {
    if (util.types.isDate(value)) {
      return format(`${key} %L`, value);
    }

    /* istanbul ignore else */
    if (value.$in) {
      // { $in: ['Send only', 'Report only'] }
      value = `ANY('{${value.$in.join(',')}}')`;
    }
  }

  if (typeof value === 'symbol') {
    /* istanbul ignore else */
    if (value === TYPE.IS_NOT_NULL) {
      return `${key} IS NOT NULL`;
    }
  }

  if (key.includes('->')) {
    return format(`${key} = %s`, value);
  }

  return format(/\.|"/.test(key) ? '%s = %s' : '%I = %s', key, value);
}

function _getOr(or: any[]) {
  const arr = or.map((obj) => {
    const _arr = [];
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      _arr.push(_getItem(key, value));
    }
    return _arr.join(' AND ');
  });

  return arr.length > 0 ? `(${arr.join(' OR ')})` : null;
}

function _coverFields(fields: any) {
  const strArr = [];
  const argArr = [];

  for (const key of Object.keys(fields)) {
    const value = fields[key];
    /* istanbul ignore else */
    if (value) {
      if (value === 1) {
        strArr.push(/\.|"/.test(key) ? '%s' : '%I');
        argArr.push(key);
      } else {
        strArr.push('%s');
        argArr.push(format(/\.|"/.test(key) ? '%s AS %I' : '%I AS %I', key, value));
      }
    }
  }

  if (argArr.length > 0) {
    return format.withArray(strArr.join(', '), argArr);
  }

  return null;
}

function _getWhereArr(where: any) {
  const arr = [];

  /* istanbul ignore else */
  if (where && typeof where === 'object') {
    for (const key of Object.keys(where)) {
      const value = where[key];
      if (key === '$or') {
        const _v = _getOr(value);
        /* istanbul ignore else */
        if (_v) {
          arr.push(_v);
        }
      } else {
        arr.push(_getItem(key, value));
      }
    }
  }

  return arr;
}

class F {
  callCounted: boolean;
  query: any;

  constructor(tableName: string) {
    this.callCounted = false;

    this.query = {
      // find
      SELECT: '*',
      FROM: `public.${tableName}`,
      'RIGHT JOIN': [],
      'LEFT JOIN': [],
      JOIN: [],
      WHERE: null,
      'ORDER BY': null,
      OFFSET: null,
      LIMIT: null,
      // insert and update
      'INSERT INTO': null, // insert
      VALUES: null,
      UPDATE: null, // update
      'DELETE FROM': null, // delete
      SET: null,
      RETURNING: null,
      values: [],
    };
  }

  join(tableName: string, keyObj: any, type = '') {
    let key = 'JOIN';
    key = type === 'RIGHT' ? 'RIGHT ' + key : key;
    key = type === 'LEFT' ? 'LEFT ' + key : key;
    const sql = Object.keys(keyObj)
      .map((k) => `public.${k} = public.${keyObj[k]}`)
      .join(' AND ');
    this.query[key].push(`public.${tableName} ON ${sql}`);
    return this;
  }

  find(where: any = {}, select: any = {}) {
    // 如果已经 count 过了
    if (this.callCounted) return this;

    const whereArr = _getWhereArr(where);
    /* istanbul ignore else */
    if (whereArr.length > 0) {
      this.query.WHERE = whereArr.join(' AND ');
    }

    /* istanbul ignore else */
    if (select && typeof select === 'object') {
      const fields = _coverFields(select);

      /* istanbul ignore else */
      if (fields) {
        this.query.SELECT = fields;
      }
    }

    return this;
  }

  count() {
    this.callCounted = true;
    this.query.SELECT = 'count(*)::int';
    return this;
  }

  sort(orderBy?: any) {
    this.query['ORDER BY'] = 'id DESC';

    /* istanbul ignore else */
    if (orderBy && typeof orderBy === 'object') {
      const arr = [];

      for (const key in orderBy) {
        if (key.includes('->')) {
          if (orderBy[key] === 1) {
            arr.push(key);
          } else {
            arr.push(`${key} DESC`);
          }
        } else {
          if (orderBy[key] === 1) {
            arr.push(format('%I', key));
          } else {
            arr.push(format('%I DESC', key));
          }
        }
      }

      /* istanbul ignore else */
      if (arr.length > 0) {
        this.query['ORDER BY'] = arr.join(', ');
      }
    }

    return this;
  }

  offset(n: any = 0) {
    const intN = parseInt(n, 10);

    /* istanbul ignore else */
    if (!isNaN(intN)) this.query.OFFSET = intN;

    return this;
  }

  limit(n: any = 10) {
    const intN = parseInt(n, 10);

    /* istanbul ignore else */
    if (!isNaN(intN)) {
      this.query.LIMIT = intN;
    }

    return this;
  }

  insertOne(row: any = {}, returning = {}) {
    this.query['INSERT INTO'] = this.query.FROM;

    /* istanbul ignore else */
    if (row && typeof row === 'object') {
      const keys = [];
      const placeholders = [];
      const values = [];

      let i = 1;
      for (const key of Object.keys(row)) {
        const value = row[key];
        keys.push(key);
        placeholders.push(`$${i}`);
        values.push(value);
        i++;
      }

      this.query['INSERT INTO'] += `(${keys.join(', ')})`;
      this.query.VALUES = `(${placeholders.join(', ')})`;
      this.query.values = values;
    }

    /* istanbul ignore else */
    if (returning && typeof returning === 'object') {
      const fields = _coverFields(returning);

      /* istanbul ignore else */
      if (fields) {
        this.query.RETURNING = fields;
      }
    }

    return this;
  }

  // insertMany(arr) {}

  update(set: any = {}, where: any = {}, returning = {}) {
    this.query.UPDATE = this.query.FROM;

    /* istanbul ignore else */
    if (set && typeof set === 'object') {
      const placeholders = [];
      const values = [];

      let i = 1;
      for (const key of Object.keys(set)) {
        const value = set[key];
        placeholders.push(`${key}=$${i}`);
        values.push(value);
        i++;
      }

      this.query.SET = `${placeholders.join(', ')}`;
      this.query.values = values;
    }

    const whereArr = _getWhereArr(where);
    /* istanbul ignore else */
    if (whereArr.length > 0) {
      this.query.WHERE = whereArr.join(' AND ');
    }

    /* istanbul ignore else */
    if (returning && typeof returning === 'object') {
      const fields = _coverFields(returning);

      /* istanbul ignore else */
      if (fields) {
        this.query.RETURNING = fields;
      }
    }

    return this;
  }

  delete(where: any = {}, returning = {}) {
    this.query['DELETE FROM'] = this.query.FROM;

    const whereArr = _getWhereArr(where);
    /* istanbul ignore else */
    if (whereArr.length > 0) {
      this.query.WHERE = whereArr.join(' AND ');
    }

    /* istanbul ignore else */
    if (returning && typeof returning === 'object') {
      const fields = _coverFields(returning);

      /* istanbul ignore else */
      if (fields) {
        this.query.RETURNING = fields;
      }
    }

    return this;
  }

  exec() {
    const strArr: string[] = [];
    const argArr: any[] = [];

    if (this.query['INSERT INTO']) {
      ['INSERT INTO', 'VALUES', 'RETURNING'].forEach((key) => {
        const value = this.query[key];

        if (value) {
          strArr.push('%s', '%s');
          argArr.push(key, value);
        }
      });

      return {
        text: format.withArray(strArr.join(' '), argArr),
        values: this.query.values,
      };
    }

    if (this.query.UPDATE) {
      ['UPDATE', 'SET', 'WHERE', 'RETURNING'].forEach((key) => {
        const value = this.query[key];

        if (value) {
          strArr.push('%s', '%s');
          argArr.push(key, value);
        }
      });

      return {
        text: format.withArray(strArr.join(' '), argArr),
        values: this.query.values,
      };
    }

    if (this.query['DELETE FROM']) {
      ['DELETE FROM', 'WHERE', 'RETURNING'].forEach((key) => {
        const value = this.query[key];

        if (value) {
          strArr.push('%s', '%s');
          argArr.push(key, value);
        }
      });

      return format.withArray(strArr.join(' '), argArr);
    }

    ['SELECT', 'FROM', 'JOIN', 'RIGHT JOIN', 'LEFT JOIN', 'WHERE', 'ORDER BY', 'OFFSET', 'LIMIT'].forEach((key) => {
      const value = this.query[key];

      // join
      if (['JOIN', 'RIGHT JOIN', 'LEFT JOIN'].indexOf(key) >= 0) {
        if (value && value.length) {
          value.forEach((item: any) => {
            strArr.push('%s', '%s');
            argArr.push(key, item);
          });
        }
        return;
      }

      // 忽略 OFFSET = 0, LIMIT = 0
      if (value) {
        strArr.push('%s', '%s');
        argArr.push(key, value);
      }
    });

    return format.withArray(strArr.join(' '), argArr);
  }
}

export function f(tableName: string) {
  return new F(tableName);
}

f.TYPE = TYPE;
f.format = format;
