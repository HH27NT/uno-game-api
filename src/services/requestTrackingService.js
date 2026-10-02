const RequestLogRepository = require('../repositories/RequestLogRepository');

const groupByEndpoint = (logs) =>
  logs.reduce((grupos, log) => {
    (grupos[log.endpointAccess] = grupos[log.endpointAccess] || []).push(log);
    return grupos;
  }, {});

class RequestTrackingService {
  constructor(requestLogRepository = new RequestLogRepository()) {
    this.requestLogRepository = requestLogRepository;
  }

  recordRequest({ endpointAccess, requestMethod, statusCode, responseTime, userId }) {
    return this.requestLogRepository.create({
      endpointAccess,
      requestMethod,
      statusCode,
      responseTime,
      userId: userId || null,
    });
  }

  getAllLogs() {
    return this.requestLogRepository.findAll();
  }

  async getRequestStats() {
    const logs = await this.getAllLogs();

    const breakdown = Object.entries(groupByEndpoint(logs)).reduce((acc, [endpoint, entradas]) => {
      acc[endpoint] = entradas.reduce((porMetodo, log) => {
        porMetodo[log.requestMethod] = (porMetodo[log.requestMethod] || 0) + 1;
        return porMetodo;
      }, {});
      return acc;
    }, {});

    return { total_requests: logs.length, breakdown };
  }

  async getResponseTimeStats() {
    const logs = await this.getAllLogs();

    return Object.entries(groupByEndpoint(logs)).reduce((acc, [endpoint, entradas]) => {
      const tiempos = entradas.map((log) => log.responseTime);
      acc[endpoint] = {
        avg: Math.round(tiempos.reduce((suma, t) => suma + t, 0) / tiempos.length),
        min: Math.round(Math.min(...tiempos)),
        max: Math.round(Math.max(...tiempos)),
      };
      return acc;
    }, {});
  }

  async getStatusCodeStats() {
    const logs = await this.getAllLogs();

    return logs
      .filter((log) => log.statusCode != null)
      .reduce((acc, log) => {
        acc[log.statusCode] = (acc[log.statusCode] || 0) + 1;
        return acc;
      }, {});
  }

  async getPopularEndpoints() {
    const logs = await this.getAllLogs();
    const conteos = Object.entries(groupByEndpoint(logs)).map(([endpoint, entradas]) => ({
      endpoint,
      count: entradas.length,
    }));

    if (conteos.length === 0) return { most_popular: null, request_count: 0 };

    const masPopular = conteos.reduce((top, actual) => (actual.count > top.count ? actual : top));
    return { most_popular: masPopular.endpoint, request_count: masPopular.count };
  }
}

module.exports = new RequestTrackingService();
module.exports.RequestTrackingService = RequestTrackingService;
