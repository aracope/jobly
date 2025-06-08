"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
      `SELECT handle
           FROM companies
           WHERE handle = $1`,
      [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
      `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
      [
        handle,
        name,
        description,
        numEmployees,
        logoUrl,
      ],
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies.
 *
 * Optional filters:
 * - name: case-insensitive substring match
 * - minEmployees: minimum number of employees
 * - maxEmployees: maximum number of employees
 *
 * If multiple filters are provided, results must satisfy all of them.
 * 
 * Throws an error if minEmployees is greater than maxEmployees (handled elsewhere).
 * 
 * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
 * */

  static async findAll(filters = {}) {
    let query =
      `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies`;

    // Array to hold individual SQL WHERE clause conditions
    let whereParts = [];

    // Array to hold values for parameterized query placeholders ($1, $2, etc.)
    let queryValues = [];

    const { name, minEmployees, maxEmployees } = filters;

    // If minEmployees filter is set, add condition and value to arrays
    if (minEmployees !== undefined) {
      queryValues.push(minEmployees);

      // Use parameter placeholder with proper index for safe queries
      whereParts.push(`num_employees >= $${queryValues.length}`);
    }

    // If maxEmployees filter is set, add condition and value similarly
    if (maxEmployees !== undefined) {
      queryValues.push(maxEmployees);
      whereParts.push(`num_employees <= $${queryValues.length}`);
    }

    // If name filter is set, add a case-insensitive LIKE condition with wildcards
    if (name) {
      queryValues.push(`%${name.toLowerCase()}%`);
      whereParts.push(`LOWER(name) LIKE $${queryValues.length}`);
    }

    // If any filters were applied, join them with AND and append to the query
    if (whereParts.length > 0) {
      query += " WHERE " + whereParts.join(" AND ");
    }

    // Orders the results alphabetically by company name
    query += " ORDER BY name";

    // Execute the constructed query with parameter values and return the rows
    const result = await db.query(query, queryValues);
    return result.rows;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
      `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
      [handle]);

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
      data,
      {
        numEmployees: "num_employees",
        logoUrl: "logo_url",
      });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
      `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
      [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}


module.exports = Company;
