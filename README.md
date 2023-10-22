# mw-registrar ![CI](https://github.com/jambonz/jambonz-mw-registrar/workflows/CI/badge.svg)

Jambonz class that handles inserting, removing, and querying the database of active sip registrations

```
const Registrar = require('jambonz-mw-registrar');
const registrar = new Registrar({host: '127.0.0.1', port: 6379});

// add a registration, optionally with an expires value in secs
registrar.add('daveh@drachtio.org', {
  contact: '10.10.1.1',
  sbcAddress: '192.168.1.1',
  protocol: 'udp'
}, 40);

const registrationDetails = await registrar.query('daveh@drachtio.org');
// {"contact":"10.10.1.1","sbcAddress":"192.168.1.1","protocol":"udp"}

// get count of users for a realm
const userCount = await registrar.getCountOfUsers('drachtio.org');

// remove a user
registrar.remove('daveh@drachtio.org');
```