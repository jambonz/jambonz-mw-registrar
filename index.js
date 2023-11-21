const debug = require('debug')('jambonz:mw-registrar');
const Emitter = require('events');

const noop = () => {
};

function makeUserKey(aor) {
  return `user:${aor}`;
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
   * @param {String} obj.contact - the sip address where this user can be reached
   * @param {String} obj.sbcAddress - the sip uri address of the sbc that manages the connection to this user
   * @param {String} obj.protocol - the transport protocol used between the sbc and the user
   * @param {String} expires - number of seconds the registration for this user is active
   * @returns {Boolean} true if the registration was successfully added
   */
  async add(aor, obj, expires) {
    debug(`Registrar#add ${aor} from ${JSON.stringify(obj)} for ${expires}`);
    const key = makeUserKey(aor);
    try {
      //cleanup expired entries
      const expiredZResult = await this.client.zremrangebyscore('active-user', 0, Date.now());
      obj.expiryTime = Date.now() + (expires * 1000);
      const result = await this.client.setex(key, expires, JSON.stringify(obj));
      const zResult = await this.client.zadd('active-user', obj.expiryTime, key);
      debug({result, zResult, expiredZResult, expires, obj}, `Registrar#add - result of adding ${aor}`);
      return result === 'OK' && zResult === 1;
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
      const sortedSetResult = await this.client.zrem('active-user', aor);
      debug(`Registrar#remove ${aor} result=${result} expiredKeys=${sortedSetResult}`);
      return result === 1;
    } catch (err) {
      this.logger.error(err, `Error removing aor ${aor}`);
      return false;
    }
  }

  //todo
  // keys shouldn't be used on a production redis as can degrade performance
  // if this method is needed, suggest using scan instead.
  // A quick search of repo and it looks like this method is used for tts cache counts.
  // Maybe a simple set which holds expiry timestamps for each tts entry, this can easily be trimmed
  // on each count invocation before returning the final count. This method could then be removed.
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

  /**
   * if param realm exists then returns count of users belonging to a realm,
   * otherwise returns count of all registered users
   * @param {String} realm - nullable realm (e.g. drachtio.org)
   * @returns {int} count of users
   */
  async getCountOfUsers(realm) {
    const users = await this.getRegisteredUsersForRealm(realm);
    debug(`Registrar#getCountOfUsers result=${users.length} realm=${realm}`);
    return users.length;
  }


  /**
   * if realm exists then return all user parts belonging to a realm,
   * otherwise returns all registered user parts
   * @param {String | undefined} realm - realm (e.g. drachtio.org)
   * @returns {[String]} Set of userParts
   */
  async getRegisteredUsersForRealm(realm) {
    try {
      //cleanup expired entries
      await this.client.zremrangebyscore('active-user', 0, Date.now());
      const keyPattern = realm ? `*${realm}` : '*';
      const pattern = realm ? new RegExp('^(.*)@' + realm + '$') : new RegExp('^(.*)@.*$');
      const users = new Set();
      let idx = 0;
      do {
        const res = await this.client.zscan('active-user', [idx, 'MATCH', keyPattern, 'COUNT', 100]);
        const next = res[0];
        const keys = res[1];
        debug(next, keys, `Registrar:getCountOfUsers result from scan cursor ${idx} ${realm}`);
        keys.forEach((k) => {
          const arr = pattern.exec(k);
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


}

module.exports = Registrar;
