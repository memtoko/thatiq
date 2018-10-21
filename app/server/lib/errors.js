/**
 * Framework or library somehow `ImproperlyConfigured`
 */
export class ImproperlyConfigured extends Error {
  constructor(msg) {
    super(msg);
    this.code = 'EBADCONF';
    this.status = 500;
  }
}

/**
 * Not implemented error
 */
export class NotImplementedError extends Error {
  constructor(msg) {
    super(msg);
    this.code = 'ENOIMPLEMENT';
    this.status = 500;
  }
}

/**
 *
 */
export class ObjectDoesnotExist extends Error {
  constructor(msg) {
    super(msg);
    this.code = 'EOBJECTDOESNOTEXIST';
    this.status = 404;
  }
}
