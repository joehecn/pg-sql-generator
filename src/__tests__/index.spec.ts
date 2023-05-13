import { f } from '../index';

it('platform_cfg', () => {
  expect(f('i18n').find({ 'platform_cfg[1]': 'Mega' }).exec()).toBe(
    "SELECT * FROM public.i18n WHERE platform_cfg[1] = 'Mega'",
  );
});

/* find */
// f
it('f()', () => {
  expect(f('i18n').exec()).toBe('SELECT * FROM public.i18n');
});
// find
it('f().find()', () => {
  expect(f('i18n').find().exec()).toBe('SELECT * FROM public.i18n');
  expect(f('i18n').find({}).exec()).toBe('SELECT * FROM public.i18n');
  expect(f('i18n').find({ $or: [] }).exec()).toBe('SELECT * FROM public.i18n');
  expect(f('i18n').find({}, {}).exec()).toBe('SELECT * FROM public.i18n');
  expect(f('i18n').find(null).exec()).toBe('SELECT * FROM public.i18n');
  expect(f('i18n').find(null, null).exec()).toBe('SELECT * FROM public.i18n');
  expect(f('i18n').find({ id: 21 }).exec()).toBe('SELECT * FROM public.i18n WHERE id = 21');
  expect(f('i18n').find({ id: 21 }, {}).exec()).toBe('SELECT * FROM public.i18n WHERE id = 21');
  expect(f('i18n').find({ key: 'update' }).exec()).toBe("SELECT * FROM public.i18n WHERE key = 'update'");
  expect(f('i18n').find({ key: /LAN/ }).exec()).toBe("SELECT * FROM public.i18n WHERE key ~* 'LAN'");
  expect(f('i18n').find({ key: /LAN/ }).exec()).toBe("SELECT * FROM public.i18n WHERE key ~* 'LAN'");

  expect(
    f('i18n')
      .find({
        $or: [{ key: /LAN/ }, { 'zh-cn': /登/ }],
      })
      .exec(),
  ).toBe("SELECT * FROM public.i18n WHERE (key ~* 'LAN' OR \"zh-cn\" ~* '登')");

  expect(f('i18n').find({ id: 21, key: 'update' }).exec()).toBe(
    "SELECT * FROM public.i18n WHERE id = 21 AND key = 'update'",
  );
  expect(f('i18n').find({ id: 21 }, { id: 1, 'zh-cn': 'zhCn' }).exec()).toBe(
    'SELECT id, "zh-cn" AS "zhCn" FROM public.i18n WHERE id = 21',
  );
  expect(f('i18n').find({}, { id: 1, 'zh-cn': 1 }).exec()).toBe('SELECT id, "zh-cn" FROM public.i18n');
});
it('jsonb.find()', () => {
  expect(
    f('json_schema')
      .find({ "schema->>'title'": /switch/ })
      .exec(),
  ).toBe("SELECT * FROM public.json_schema WHERE schema->>'title' ~* 'switch'");
  expect(
    f('json_schema')
      .find({
        $or: [{ "schema->>'title'": /switch/ }],
      })
      .exec(),
  ).toBe("SELECT * FROM public.json_schema WHERE (schema->>'title' ~* 'switch')");
  expect(
    f('json_schema')
      .find({
        $or: [{ "schema->>'title'": /switch/ }, { schema_type: 'instruction_profile' }],
      })
      .exec(),
  ).toBe(
    "SELECT * FROM public.json_schema WHERE (schema->>'title' ~* 'switch' OR schema_type = 'instruction_profile')",
  );

  expect(
    f('json_schema')
      .find({ schema_type: 'instruction_profile', "schema->>'title'": /switch/ })
      .exec(),
  ).toBe("SELECT * FROM public.json_schema WHERE schema_type = 'instruction_profile' AND schema->>'title' ~* 'switch'");
  expect(
    f('json_schema')
      .find({
        schema_type: 'instruction_profile',
        $or: [{ "schema->>'title'": /switch/ }],
      })
      .exec(),
  ).toBe(
    "SELECT * FROM public.json_schema WHERE schema_type = 'instruction_profile' AND (schema->>'title' ~* 'switch')",
  );
  expect(
    f('json_schema')
      .find({
        schema_type: 'instruction_profile',
        $or: [{ "schema->>'title'": /switch/ }, { "schema->>'description'": /1/ }],
      })
      .exec(),
  ).toBe(
    "SELECT * FROM public.json_schema WHERE schema_type = 'instruction_profile' AND (schema->>'title' ~* 'switch' OR schema->>'description' ~* '1')",
  );
  expect(
    f('json_schema')
      .find({
        schema_type: 'instruction_profile',
        $or: [{ "schema->>'title'": /switch/ }, { "schema->>'type'": 'string' }],
      })
      .exec(),
  ).toBe(
    "SELECT * FROM public.json_schema WHERE schema_type = 'instruction_profile' AND (schema->>'title' ~* 'switch' OR schema->>'type' = 'string')",
  );
});
// path
it('path', () => {
  expect(f('tree').find({ 'path @>': '63' }).exec()).toBe("SELECT * FROM public.tree WHERE path @> '63'");
});
// IS NOT NULL
it('IS NOT NULL', () => {
  // 下面两个方法等效
  // 暂时也没想到更好的方法
  expect(f('lift').find({ 'tree_id IS NOT NULL': 'tree_id IS NOT NULL' }).exec()).toBe(
    'SELECT * FROM public.lift WHERE tree_id IS NOT NULL',
  );
  expect(f('lift').find({ tree_id: f.TYPE.IS_NOT_NULL }).exec()).toBe(
    'SELECT * FROM public.lift WHERE tree_id IS NOT NULL',
  );
});
// <>
it('<>', () => {
  expect(f('tree').find({ 'path <>': '63' }).exec()).toBe("SELECT * FROM public.tree WHERE path <> '63'");
});
// Date
it('Date', () => {
  expect(f('log_replace_octopus_card').find({ 'created_at >=': '2022-02-01' }).exec()).toBe(
    `SELECT * FROM public.log_replace_octopus_card WHERE created_at >= '2022-02-01'`,
  );
  expect(
    f('log_replace_octopus_card')
      .find({ 'created_at >=': new Date('2022-02-01') })
      .exec(),
  ).toBe(`SELECT * FROM public.log_replace_octopus_card WHERE created_at >= '2022-02-01 00:00:00.000+00'`);
});
// ->> number
it('->> number', () => {
  expect(f('json_schema').find({ "schema->>'count'": 0 }).exec()).toBe(
    "SELECT * FROM public.json_schema WHERE schema->>'count' = 0",
  );
});
// count
it('f().count()', () => {
  expect(f('i18n').count().exec()).toBe('SELECT count(*)::int FROM public.i18n');
  // 忽略 count 后 find
  expect(f('i18n').count().find({}, {}).exec()).toBe('SELECT count(*)::int FROM public.i18n');
});
// sort
it('f().sort()', () => {
  // default id ASC
  expect(f('i18n').sort().exec()).toBe('SELECT * FROM public.i18n ORDER BY id DESC');
  expect(f('i18n').sort(null).exec()).toBe('SELECT * FROM public.i18n ORDER BY id DESC');
  expect(f('i18n').sort({}).exec()).toBe('SELECT * FROM public.i18n ORDER BY id DESC');
  expect(f('i18n').sort({ id: 1 }).exec()).toBe('SELECT * FROM public.i18n ORDER BY id');
  expect(f('i18n').sort({ id: -1 }).exec()).toBe('SELECT * FROM public.i18n ORDER BY id DESC');
  expect(f('i18n').sort({ id: 1, key: -1 }).exec()).toBe('SELECT * FROM public.i18n ORDER BY id, key DESC');
  expect(f('i18n').sort({ id: -1, key: -1 }).exec()).toBe('SELECT * FROM public.i18n ORDER BY id DESC, key DESC');
  expect(f('i18n').sort({ id: -1, key: 1 }).exec()).toBe('SELECT * FROM public.i18n ORDER BY id DESC, key');
  expect(f('i18n').sort({ 'zh-cn': 1 }).exec()).toBe('SELECT * FROM public.i18n ORDER BY "zh-cn"');
});
it('jsonb.sort()', () => {
  expect(f('json_schema').sort({ "schema->>'title'": 1 }).exec()).toBe(
    "SELECT * FROM public.json_schema ORDER BY schema->>'title'",
  );
  expect(f('json_schema').sort({ "schema->>'title'": -1 }).exec()).toBe(
    "SELECT * FROM public.json_schema ORDER BY schema->>'title' DESC",
  );
});
// sort & offset
it('f().sort().offset()', () => {
  expect(f('i18n').sort().offset().exec()).toBe('SELECT * FROM public.i18n ORDER BY id DESC');
  expect(f('i18n').sort().offset(10).exec()).toBe('SELECT * FROM public.i18n ORDER BY id DESC OFFSET 10');
});
// sort & offset & limit
it('f().sort().offset().limit()', () => {
  expect(f('i18n').sort().offset().limit().exec()).toBe('SELECT * FROM public.i18n ORDER BY id DESC LIMIT 10');
  expect(f('i18n').sort().offset(20).limit(20).exec()).toBe(
    'SELECT * FROM public.i18n ORDER BY id DESC OFFSET 20 LIMIT 20',
  );
});
// $in
it('$in', () => {
  const where = {
    key: 'home',
    id: { $in: [3, 4] },
  };
  const select = { key: 1 };

  expect(f('i18n').find(where, select).exec()).toBe(
    "SELECT key FROM public.i18n WHERE key = 'home' AND id = ANY('{3,4}')",
  );
});
// false
it('false', () => {
  const where = {
    is_admin: false,
  };
  expect(f('user').find(where).exec()).toBe('SELECT * FROM public.user WHERE is_admin = false');
});
/* insert */
it('insertOne()', () => {
  expect(f('user').insertOne().exec()).toEqual({ text: 'INSERT INTO public.user() VALUES ()', values: [] });
});
it('insertOne({}, {})', () => {
  expect(
    f('user')
      .insertOne(
        {
          name: 'joe',
          user_age: 40,
        },
        { name: 1, user_age: 'userAge' },
      )
      .exec(),
  ).toEqual({
    text: 'INSERT INTO public.user(name, user_age) VALUES ($1, $2) RETURNING name, user_age AS "userAge"',
    values: ['joe', 40],
  });
});
/** join */
it('f().join()', () => {
  const where = { $or: [{ organization_application_id: '15', platform: 'Mega' }] };
  const select = {
    id: 1,
    'device."custom_id"': 'customID',
    'device."state"': 1,
    'device_profile."custom_id"': 'profileCustomID',
  };

  expect(
    f('device')
      .join('device_profile', { 'device.device_profile_id': 'device_profile.id' }, 'RIGHT')
      .find(where, select)
      .exec(),
  ).toEqual(
    'SELECT id, device."custom_id" AS "customID", device."state", device_profile."custom_id" AS "profileCustomID" FROM public.device RIGHT JOIN public.device_profile ON public.device.device_profile_id = public.device_profile.id WHERE (organization_application_id = \'15\' AND platform = \'Mega\')',
  );

  expect(f('device').join('device_profile', { 'device.device_profile_id': 'device_profile.id' }).exec()).toEqual(
    'SELECT * FROM public.device JOIN public.device_profile ON public.device.device_profile_id = public.device_profile.id',
  );

  expect(
    f('device').join('device_profile', { 'device.device_profile_id': 'device_profile.id' }, 'LEFT').exec(),
  ).toEqual(
    'SELECT * FROM public.device LEFT JOIN public.device_profile ON public.device.device_profile_id = public.device_profile.id',
  );

  expect(
    f('device').join('device_profile', { 'device."device-profile-id"': 'device_profile."id"' }, 'LEFT').exec(),
  ).toEqual(
    'SELECT * FROM public.device LEFT JOIN public.device_profile ON public.device."device-profile-id" = public.device_profile."id"',
  );

  const where1 = {
    'device_profile.age': 21,
    $or: [
      {
        organization_application_id: 15,
        'device_profile.platform': 'Mega',
        'device_profile.custom_id': /mega-tereo/,
      },
    ],
  };
  const select1 = {
    'device."id"': 1,
    'device."custom_id"': 'customID',
    'device."state"': 1,
    'device."firmware"': 1,
    'device."mac"': 1,
    'device_profile."custom_id"': 'profileCustomID',
    'device."name"': 1,
    'device."description"': 1,
    'device_profile."category"': 1,
    'device_profile."model"': 1,
    'device_profile."platform"': 1,
    'device_profile."name"': 'deviceProfileName',
    'device_profile."icon"': 'icon',
  };
  const sort = { id: -1 };
  const text = f('device')
    .join('device_profile', { 'device.device_profile_id': 'device_profile.id' }, 'RIGHT')
    .find(where1, select1)
    .sort(sort)
    .offset(0)
    .limit(10)
    .exec();
  const result =
    'SELECT device."id", device."custom_id" AS "customID", device."state", device."firmware", device."mac", device_profile."custom_id" AS "profileCustomID", device."name", device."description", device_profile."category", device_profile."model", device_profile."platform", device_profile."name" AS "deviceProfileName", device_profile."icon" AS icon ' +
    'FROM public.device RIGHT JOIN public.device_profile ON public.device.device_profile_id = public.device_profile.id ' +
    "WHERE device_profile.age = 21 AND (organization_application_id = 15 AND device_profile.platform = 'Mega' AND device_profile.custom_id ~* 'mega-tereo') ORDER BY id DESC LIMIT 10";
  expect(text).toEqual(result);
});
/** join */
it('f().join() 测试多个join', () => {
  const select = {
    'info.id': 'id',
    image: 1,
    'info.organization_id': 'organization_id',
    'info.description': 'infoDescription',
    title: 'name',
    star: 1,
    category_id: 1,
    'info_category.name': 'categoryName',
    'info_translate.name': 'title',
    'info_translate.description': 'description',
    content: 1,
    language: 1,
  };
  const where = {};
  const sort = { id: -1 };
  const text = f('info')
    .join('info_translate', { 'info.id': 'info_translate.id' })
    .join('info_category', { 'info.category_id': 'info_category.id' })
    .find(where, select)
    .sort(sort)
    .offset(0)
    .limit(10)
    .exec();
  const result =
    'SELECT info.id AS id, image, info.organization_id AS organization_id, info.description AS "infoDescription", title AS name, star, category_id, info_category.name AS "categoryName", info_translate.name AS title, info_translate.description AS description, content, language FROM public.info JOIN public.info_translate ON public.info.id = public.info_translate.id JOIN public.info_category ON public.info.category_id = public.info_category.id ORDER BY id DESC LIMIT 10';
  expect(text).toEqual(result);
});
