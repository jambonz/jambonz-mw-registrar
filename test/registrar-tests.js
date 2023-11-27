const test = require('tape');

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

test('registrar tests', async(t) => {
  const Registrar = require('..');
  const {client} = require('@jambonz/realtimedb-helpers')({
    host: '127.0.0.1',
    port: 16379,
  });
  const registrar = new Registrar(null, client);

  let result = await registrar.add(
    'dhorton@drachtio.org',
    {
      contact: '10.10.1.1',
      sbcAddress: '192.168.1.1',
      protocol: 'udp',
    },
    2,
  );
  t.ok(
    result,
    'successfully added an address-of record to registrar with expires 2',
  );

  result = await registrar.getCountOfUsers('drachtio.org');
  t.ok(result === 1, 'count of users in realm returned 1');

  result = await registrar.getCountOfUsers();
  t.ok(result === 1, 'count of users in realm returned 1');

  result = await registrar.query('dhorton@drachtio.org');
  t.ok(result !== null, `successfully retrieved ${JSON.stringify(result)}`);

  result = await registrar.getRegisteredUsersForRealm('drachtio.org');
  t.ok(result.length === 1, `successfully retrieved registered users ${JSON.stringify(result)}`);

  await new Promise((resolve) => setTimeout(() => resolve(), 2500));

  result = await registrar.query('dhorton@drachtio.org');
  t.ok(result === null, 'address-of-record was removed after 2 secs');

  result = await registrar.getCountOfUsers('drachtio.org');
  t.ok(result === 0, 'count of users in realm returned 0');

  result = await registrar.getCountOfUsers();
  t.ok(result === 0, 'count of total users returned 0');

  // read
  result = await registrar.add(
    'dhorton@drachtio.org',
    {
      contact: '10.10.1.1',
      sbcAddress: '192.168.1.1',
      protocol: 'udp',
    },
    2,
  );
  t.ok(result, 'successfully re-added aor');

  result = await registrar.remove('dhorton@drachtio.org');
  t.ok(result === true, 'successfully removed aor');

  const barFooUserCount = 30000;
  const fooBarUserCount = 1000;

  const barFooStart = process.hrtime();
  for (let i = 0; i < barFooUserCount; i++) {
    if (i % 1000 === 0) {
      t.comment(`Added ${i} barfoo.com users`);
    }
    await registrar.add(
      `user-${i}@barfoo.com`,
      {
        contact: '10.10.1.1',
        sbcAddress: '192.168.1.1',
        protocol: 'udp',
      },
      120,
    );
  }
  const barFooEnd = process.hrtime(barFooStart);
  t.pass(`added barfoo users in ${Math.round(barFooEnd[1] / 1000000)}ms`);

  const fooBarStart = process.hrtime();
  for (let i = 0; i < fooBarUserCount; i++) {
    if (i % 100 === 0) {
      t.comment(`Added ${i} foobar.com users`);
    }
    await registrar.add(
      `user-${i}@foobar.com`,
      {
        contact: '10.10.1.1',
        sbcAddress: '192.168.1.1',
        protocol: 'udp',
      },
      120,
    );
  }
  const fooBarEnd = process.hrtime(fooBarStart);
  t.pass(`added foobar users in ${Math.round(fooBarEnd[1] / 1000000)}ms`);

  const countBarFooTimeStart = process.hrtime();
  result = await registrar.getCountOfUsers('barfoo.com');
  const countBarFooTimeEnd = process.hrtime(countBarFooTimeStart);
  const responseTimeBarFoo = Math.round(countBarFooTimeEnd[1] / 1000000);
  t.ok(
    result === barFooUserCount,
    `counted all ${barFooUserCount} barfoo.com users in ${responseTimeBarFoo}ms`,
  );
  t.ok(
    responseTimeBarFoo < 500,
    `${barFooUserCount} barfoo.com users response time under 500ms`,
  );


  const countFooBarTimeStart = process.hrtime();
  result = await registrar.getCountOfUsers('foobar.com');
  const countFooBarTimeEnd = process.hrtime(countFooBarTimeStart);
  const responseTimeFooBar = Math.round(countFooBarTimeEnd[1] / 1000000);
  t.ok(
    result === fooBarUserCount,
    `counted all ${fooBarUserCount} foobar.com users in ${responseTimeFooBar}ms`,
  );
  t.ok(
    responseTimeFooBar < 500,
    `${fooBarUserCount} foobar.com users response time under 500ms`,
  );

  t.end();
});
