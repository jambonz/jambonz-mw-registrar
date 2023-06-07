const test = require("tape");
const debug = require("debug")("jambonz:middleware");

process.on("unhandledRejection", (reason, p) => {
  console.log("Unhandled Rejection at: Promise", p, "reason:", reason);
});

function connect(connectable) {
  return new Promise((resolve, reject) => {
    connectable.on("connect", () => {
      return resolve();
    });
  });
}

test("registrar tests", async (t) => {
  const Registrar = require("..");
  const { client } = require("@jambonz/realtimedb-helpers")({
    host: "127.0.0.1",
    port: 16379,
  });
  const registrar = new Registrar(null, client);
  let timeStart, timeEnd;

  let result = await registrar.add(
    "dhorton@drachtio.org",
    {
      contact: "10.10.1.1",
      sbcAddress: "192.168.1.1",
      protocol: "udp",
    },
    2
  );
  t.ok(
    result,
    "successfully added an address-of record to registrar with expires 2"
  );

  result = await registrar.getCountOfUsers("drachtio.org");
  t.ok(result === 1, "count of users in realm returned 1");

  result = await registrar.getCountOfUsers();
  t.ok(result === 1, "count of users in realm returned 1");

  result = await registrar.query("dhorton@drachtio.org");
  t.ok(result !== null, `successfully retrieved ${JSON.stringify(result)}`);

  await new Promise((resolve) => setTimeout(() => resolve(), 2500));

  result = await registrar.query("dhorton@drachtio.org");
  t.ok(result === null, `address-of-record was removed after 2 secs`);

  result = await registrar.getCountOfUsers("drachtio.org");
  t.ok(result === 0, "count of users in realm returned 0");

  result = await registrar.getCountOfUsers();
  t.ok(result === 0, "count of total users returned 0");

  // readd
  result = await registrar.add(
    "dhorton@drachtio.org",
    {
      contact: "10.10.1.1",
      sbcAddress: "192.168.1.1",
      protocol: "udp",
    },
    2
  );
  t.ok(result, "successfully re-added aor");

  result = await registrar.remove("dhorton@drachtio.org");
  t.ok(result == true, "successfully removed aor");

  const hrstart = process.hrtime();
  for (let i = 0; i < 1000; i++) {
    await registrar.add(
      `user-${i}@foobar.com`,
      {
        contact: "10.10.1.1",
        sbcAddress: "192.168.1.1",
        protocol: "udp",
      },
      20
    );
  }
  const hrend = process.hrtime(hrstart);
  t.pass(`added the users in ${Math.round(hrend[1] / 1000000)}ms`);
  timeStart = process.hrtime();
  result = await registrar.getCountOfUsers("foobar.com");
  timeEnd = process.hrtime(timeStart)
  t.ok(
    result === 1000,
    `counted all 1,000 users in ${Math.round(timeEnd[1] / 1000000)}ms`
  );

  t.end();
});
