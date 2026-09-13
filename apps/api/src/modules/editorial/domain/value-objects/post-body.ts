import { EmptyPostBodyError } from '../errors.js';

export class PostBody {
  /**
   * A draft can be any length, but the platform publishes long-form writing:
   * anything shorter than this is a note, not an article.
   */
  static readonly MIN_PUBLISHABLE_LENGTH = 500;

  private constructor(readonly value: string) {}

  static create(raw: string): PostBody {
    const value = raw.trim();

    if (value.length === 0) {
      throw new EmptyPostBodyError();
    }

    return new PostBody(value);
  }

  isLongEnoughToPublish(): boolean {
    return this.value.length >= PostBody.MIN_PUBLISHABLE_LENGTH;
  }

  get length(): number {
    return this.value.length;
  }

  toString(): string {
    return this.value;
  }
}
