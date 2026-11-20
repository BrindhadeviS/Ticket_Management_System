// An error that carries an HTTP status, so controllers can reply properly.
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}