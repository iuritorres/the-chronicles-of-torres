import { InvalidPostTitleError } from '../errors.js';

const MAX_LENGTH = 140;

export class PostTitle {
  private constructor(readonly value: string) {}

  static create(raw: string): PostTitle {
    const value = raw.trim().replace(/\s+/g, ' ');

    if (value.length === 0) {
      throw new InvalidPostTitleError('A post title cannot be empty.');
    }
    if (value.length > MAX_LENGTH) {
      throw new InvalidPostTitleError(
        `A post title must be at most ${MAX_LENGTH} characters, got ${value.length}.`,
      );
    }

    return new PostTitle(value);
  }

  equals(other: PostTitle): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
