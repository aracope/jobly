const { sqlForPartialUpdate } = require("./sql");
const { BadRequestError } = require("../expressError");

describe("sqlForPartialUpdate", function () {
  test("works with one field", function () {
    const data = { firstName: "Aliya" };
    const jsToSql = { firstName: "first_name" };
    const result = sqlForPartialUpdate(data, jsToSql);
    expect(result).toEqual({
      setCols: '"first_name"=$1',
      values: ["Aliya"]
    });
  });

  test("works with multiple fields", function () {
    const data = { firstName: "Aliya", age: 32 };
    const jsToSql = { firstName: "first_name" };
    const result = sqlForPartialUpdate(data, jsToSql);
    expect(result).toEqual({
      setCols: '"first_name"=$1, "age"=$2',
      values: ["Aliya", 32]
    });
  });

  test("uses default column name if no mapping provided", function () {
    const data = { age: 40 };
    const jsToSql = {};
    const result = sqlForPartialUpdate(data, jsToSql);
    expect(result).toEqual({
      setCols: '"age"=$1',
      values: [40]
    });
  });

  test("throws BadRequestError with no data", function () {
    expect(() =>
      sqlForPartialUpdate({}, {})
    ).toThrow(BadRequestError);
  });
});
