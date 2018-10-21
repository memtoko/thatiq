export class TokenAlreadyExist extends Error {
  constructor(oldToken, newToken) {
    super('There is already exists a session with the same token');
    this.oldToken = oldToken;
    this.newToken = newToken;
    this.code = 'ETOKENEXIST'
  }
}

export class TokenDoesnotExist extends Error {
  constructor(token) {
    super('There is no session with the given token');
    this.token = token;
    this.code = 'ETOKENNOTEXIST';
  }
}
