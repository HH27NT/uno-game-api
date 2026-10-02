// envuelve un resultado ok/fail para no regresar errores sueltos
class Result {
  constructor(success, value, error) {
    this.success = success;
    this.value = value;
    this.error = error;
  }

  static ok(value) {
    return new Result(true, value, null);
  }

  static fail(message, status = 400) {
    return new Result(false, null, { message, status });
  }

  map(fn) {
    return this.success ? Result.ok(fn(this.value)) : this;
  }

  match(handlers) {
    return this.success ? handlers.ok(this.value) : handlers.fail(this.error);
  }
}

module.exports = Result;
