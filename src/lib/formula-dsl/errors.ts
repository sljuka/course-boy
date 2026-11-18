// A formula problem the editor can show in the app's language (SLJ-235): `key`
// and `values` are a translation key and its values; `message` stays English
// for logs and tests.
export class FormulaError extends Error {
  readonly key: string;
  readonly values?: Record<string, number | string>;

  constructor(message: string, key: string, values?: Record<string, number | string>) {
    super(message);
    this.name = "FormulaError";
    this.key = key;
    this.values = values;
  }
}
