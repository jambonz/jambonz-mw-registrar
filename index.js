const debug = require('debug')('jambonz:mw-registrar');
const Emitter = require('events');

const noop = () => {};

function makeUserKey(aor) {
  return `user:${aor}`;
}
function makeUserPattern(realm) {
  return realm ? `user:*@${realm}` : 'user:*';
}

class Registrar extends Emitter {
  constructor(logger, redisClient) {
    super();
    if (!logger) {
      logger = Object.create(null);
      logger.info = logger.debug = logger.error = noop;
    }
    this.logger = logger;
    this.client = redisClient;
  }

  /* for use by test suite only */
  _quit() {
    this.client.end(true);
  }

  /**
   * Add a registration for a user identified by a sip address-of-record
   * @param {String} aor - a sip address-of-record for a user (e.g. daveh@drachtio.org)
   * @param {String} contact - the sip address where this user can be reached
   * @param {String} sbcAddress - the sip uri address of the sbc that manages the connection to this user
   * @param {String} protocol - the transport protocol used between the sbc and the user
   * @param {String} expires - number of seconds the registration for this user is active
   * @returns {Boolean} true if the registration was successfully added
   */
  async add(aor, obj, expires) {
    debug(`Registrar#add ${aor} from ${JSON.stringify(obj)} for ${expires}`);
    const key = makeUserKey(aor);
    try {
      const now = Date.now();
      obj.expiryTime = now + (expires * 1000);
      const result = await this.client.setex(key, expires, JSON.stringify(obj));
      debug({result, expires, obj}, `Registrar#add - result of adding ${aor}`);
      return result === 'OK';
    } catch (err) {
      this.logger.error(err, `Error adding user ${aor}`);
      return false;
    }
  }

  /**
   * Retrieve the registration details for a user
   * @param {String} aor - the address-of-record for the user
   * @returns {Object} an object containing the registration details for this user, or null
   * if the user does not have an active registration.
   */
  async query(aor) {
    try {
      const key = makeUserKey(aor);
      const result = await this.client.get(key);
      return JSON.parse(result);
    } catch (err) {
      this.logger.error({err}, `@jambonz/mw-registrar query: Error retrieving ${aor}`);
    }
  }

  /**
   * Remove the registration for a user
  * @param {String} aor - the address-of-record for the user
  * @returns {Boolean} true if the registration was successfully removed
  */
  async remove(aor) {
    const key = makeUserKey(aor);
    try {
      const result = await this.client.del(key);
      debug(`Registrar#remove ${aor} result: ${result}`);
      return result === 1;
    } catch (err) {
      this.logger.error(err, `Error removing aor ${aor}`);
      return false;
    }
  }

  async keys(prefix) {
    try {
      prefix = prefix || '*';
      const result = await this.client.keys(prefix);
      debug(`keys ${prefix}: ${JSON.stringify(result)}`);
      return result;
    } catch (err) {
      this.logger.error(err, `Error keys ${prefix}`);
      debug(err, `Error keys prefix ${prefix}`);
      return null;
    }
  }

  async getCountOfUsers(realm) {
    try {
      const users = new Set();
      let idx = 0;
      const pattern = makeUserPattern(realm);
      do {
        const res = await this.client.scan([idx, 'MATCH', pattern, 'COUNT', 100]);
        const next = res[0];
        const keys = res[1];
        debug(next, keys,  `Registrar:getCountOfUsers result from scan cursor ${idx} ${realm}`);
        keys.forEach((k) => users.add(k));
        idx = parseInt(next);
      } while (idx !== 0);
      return users.size;
    } catch (err) {
      debug(err);
      this.logger.error(err, 'getCountOfUsers: Error retrieving registered users');
    }
  }

  async getRegisteredUsersForRealm(realm) {
    try {
      const users = new Set();
      let idx = 0;
      const pattern = makeUserPattern(realm);
      do {
        const res = await this.client.scan([idx, 'MATCH', pattern, 'COUNT', 100]);
        const next = res[0];
        const keys = res[1];
        debug(next, keys,  `Registrar:getCountOfUsers result from scan cursor ${idx} ${realm}`);
        keys.forEach((k) => {
          const arr = /^user:(.*)@.*$/.exec(k);
          if (arr) users.add(arr[1]);
        });
        idx = parseInt(next);
      } while (idx !== 0);
      return [...users];
    } catch (err) {
      debug(err);
      this.logger.error(err, 'getRegisteredUsersForRealm: Error retrieving registered users');
    }
  }

  async getRegisteredUsersDetailsForRealm(realm) {
    try {
      const users = new Set();
      let idx = 0;
      const pattern = makeUserPattern(realm);
      do {
        const res = await this.client.scan([idx, 'MATCH', pattern, 'COUNT', 100]);
        const next = res[0];
        const keys = res[1];
        debug(next, keys,  `Registrar:getCountOfUsers result from scan cursor ${idx} ${realm}`);
        for (const k of keys) {
          if (/^user:.*$/.test(k)) {
            users.add(await this.client.get(k));
          }
        }
        idx = parseInt(next);
      } while (idx !== 0);
      return [...users];
    } catch (err) {
      debug(err);
      this.logger.error(err, 'getRegisteredUsersDetailsForRealm: Error retrieving registered users');
    }
  }
}

module.exports = Registrar;
