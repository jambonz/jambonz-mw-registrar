const test = require('blue-tape');
const debug = require('debug')('jambonz:middleware');

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

function connect(connectable) {
  return new Promise((resolve, reject) => {
    connectable.on('connect', () => {
      return resolve();
    });
  });
}

test('registrar tests', (t) => {
  const Registrar = require('..');
  const registrar = new Registrar({host: '127.0.0.1', port: 16379});
  let timeStart, timeEnd;

  connect(registrar)
    .then(() => {
      return t.pass('connected to redis');
    })
    .then(() => {
      return registrar.add('dhorton@drachtio.org', {
        contact: '10.10.1.1',
        sbcAddress: '192.168.1.1',
        protocol: 'udp'
      }, 2);
    })
    .then((result) => {
      t.ok(result, 'successfully added an address-of record to registrar with expires 2');
      return;
    })
    .then(() => {
      return registrar.getCountOfUsers('drachtio.org');
    })
    .then((count) => {
      t.ok(count === 1, 'count of users in realm returned 1');
      return;
    })
    .then(() => {
      return registrar.getCountOfUsers();
    })
    .then((count) => {
      t.ok(count === 1, 'count of users in realm returned 1');
      return;
    })
    .then(() => {
      return registrar.query('dhorton@drachtio.org');
    })
    .then((item) => {
      t.ok(item !== null, `successfully retrieved ${JSON.stringify(item)}`);
      //wait 2.5 secs
      return new Promise((resolve) => setTimeout(()=> resolve(), 2500));
    })
    .then(() => {
      return registrar.query('dhorton@drachtio.org');
    })
    .then((item) => {
      t.ok(item === null, `address-of-record was removed after 2 secs`);
    })
    .then(() => {
      return registrar.getCountOfUsers('drachtio.org');
    })
    .then((count) => {
      t.ok(count === 0, 'count of users in realm returned 0');
      return;
    })
    .then(() => {
      return registrar.getCountOfUsers();
    })
    .then((count) => {
      t.ok(count === 0, 'count of total users returned 0');
      return;
    })
    .then(() => {
      return registrar.add('dhorton@drachtio.org', {
        contact: '10.10.1.1',
        sbcAddress: '192.168.1.1',
        protocol: 'udp'
      }, 2);
    })
    .then((result) => {
      return t.ok(result, 'successfully re-added aor');
    })
    .then(() => {
      return registrar.remove('dhorton@drachtio.org');
    })
    .then((result) => {
      return t.ok(result == true, 'successfully removed aor');
    })
    .then(async() => {
      t.pass('adding 1,000 users..');
      const hrstart = process.hrtime();
      for (let i = 0; i < 1000; i++) {
        await registrar.add(`user-${i}@foobar.com`, {
          contact: '10.10.1.1',
          sbcAddress: '192.168.1.1',
          protocol: 'udp'
        }, 20)
      }
      const hrend = process.hrtime(hrstart);
      t.pass(`added the users in ${Math.round(hrend[1] / 1000000)}ms`);
      timeStart = process.hrtime();
      return registrar.getCountOfUsers('foobar.com');
    })
    .then((count) => {
      timeEnd = process.hrtime(timeStart)
      t.ok(count === 1000, `counted all 1,000 users in ${Math.round(timeEnd[1] / 1000000)}ms`);
    })
    .then(() => {
      //registrar._quit();
      return t.end();
    });
});
