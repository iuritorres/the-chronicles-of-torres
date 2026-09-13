import { InvalidSlugError } from '../errors.js';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The public address of a post. Immutable once the post goes live. */
export class Slug {
  private constructor(readonly value: string) {}

  static fromTitle(title: string): Slug {
    const value = title
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .trim()
      .replace(/[\s-]+/g, '-');

    if (!SLUG_PATTERN.test(value)) {
      throw new InvalidSlugError(title);
    }

    return new Slug(value);
  }

  static restore(value: string): Slug {
    if (!SLUG_PATTERN.test(value)) {
      throw new InvalidSlugError(value);
    }
    return new Slug(value);
  }

  equals(other: Slug): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
