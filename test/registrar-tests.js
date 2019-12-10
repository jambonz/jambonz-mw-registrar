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
      return registrar.keys();
    })
    .then((result) => {
      t.ok(result, 'successfully added an address-of record to registrar with expires 2');
      return t.ok(`keys are now ${result}`);s
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
      return t.pass(`removed with result ${result}`);
    })
    .then(() => {
      return t.end();
    });
});
