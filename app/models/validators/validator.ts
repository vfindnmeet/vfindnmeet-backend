export default class Validator {
  attributes: any;
  errors: any;

  constructor(attributes = {}) {
    this.attributes = attributes;
    this.errors = {};
  }

  validate() {
    return true;
  }
}
