const { BadRequestError } = require("../expressError");

/**
 * Generates a SQL string and values array for a partial UPDATE.
 *
 * This function is used to dynamically construct a SQL SET clause
 * for an UPDATE statement, based on the fields provided in `dataToUpdate`.
 * It also maps JavaScript-style camelCase keys to SQL-style snake_case
 * column names using the `jsToSql` conversion object.
 *
 * Example:
 *   dataToUpdate = { firstName: "Aliya", age: 32 }
 *   jsToSql = { firstName: "first_name" }
 *
 *   Returns:
 *     {
 *       setCols: '"first_name"=$1, "age"=$2',
 *       values: ["Aliya", 32]
 *     }
 *
 * Throws:
 *   BadRequestError if no data is provided
 *
 * @param {Object} dataToUpdate - keys/values to update
 * @param {Object} jsToSql - maps JS keys to SQL column names
 * @returns {Object} - { setCols, values }
 */

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
