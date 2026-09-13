/**
 * A business rule was violated.
 *
 * Carries a stable `code`, never an HTTP status: status is a transport concern
 * and belongs to the infrastructure layer, which maps codes onto it.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
