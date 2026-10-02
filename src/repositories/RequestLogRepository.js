const Repository = require('./Repository');
const { Readable, Creatable } = require('./traits');
const { RequestLog } = require('../models');

// isp: solo lectura + creacion, un registro de tracking nunca se edita ni se borra
class RequestLogRepository extends Creatable(Readable(Repository)) {
  constructor() {
    super(RequestLog);
  }
}

module.exports = RequestLogRepository;
