const test = require('tape');
const path = require('path');
const exec = require('child_process').exec;

test('starting docker network..', (t) => {
  exec(`docker-compose -f ${__dirname}${path.sep}docker-compose-testbed.yaml up -d`, (err, stdout, stderr) => {
    t.end(err);
  });
});
