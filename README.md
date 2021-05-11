# jambonz-mw-registrar [![Build Status](https://secure.travis-ci.org/jambonz/jambonz-mw-registrar.png)](http://travis-ci.org/jambonz/jambonz-mw-registrar)

DEPRECATED!  jambonz/mw-registrar is now used instead.

Jambonz class that handles inserting, removing, and querying the database of active sip registrations

```
const Registrar = require('jambonz-mw-registrar');
const registrar = new Registrar({host: '127.0.0.1', port: 6379});

registrar.add('daveh@drachtio.org', '10.10.1.1', '192.168.1.1', 'udp', 2);
// aor, contact, sbcAddress, expires

const registrationDetails = await registrar.query('daveh@drachtio.org');
// {"contact":"10.10.1.1","sbcAddress":"192.168.1.1","protocol":"udp"}

registrar.remove('daveh@drachtio.org');
```
