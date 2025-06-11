"use strict";

const db = require("../db");
const { sqlForPartialUpdate } = require("../helpers/sql");

const { BadRequestError, NotFoundError } = require("../expressError");

/** Related functions for jobs. */

class Job {
    /** Create a job (from data), update db, return new job data.
    * */

    static async create({ title, salary, equity, companyHandle }) {
        const result = await db.query(
            `INSERT INTO Jobs (title, salary, equity, company_handle)
            VALUES ($1, $2, $3, $4)
            RETURNING id, title, salary, equity, company_handle as "companyHandle"`,
            [title, salary, equity, companyHandle],
        );
        console.log("Job.create result:", result.rows[0]);
        return result.rows[0];
    }


    /** Find all jobs. **/
// Filtering logic will be implemented later
    static async findAll(/**filters = {}**/) {
        const result = await db.query(
            `SELECT id,
                title,
                salary,
                equity,
                company_handle AS "companyHandle"
            FROM jobs
            ORDER BY id`
        );
        return result.rows;
    }

    /** Get job by ID **/

    static async get(id) {
        const result = await db.query(
            `SELECT id,
                title,
                salary,
                equity,
                company_handle AS "companyHandle"
            FROM jobs
            WHERE id = $1`,
            [id]);

        const job = result.rows[0];

        if (!job) throw new NotFoundError(`No job: ${id}`);

        return job;
    }

    /** Update job data with `data`.**/

    static async update(id, data) {
        const { setCols, values } = sqlForPartialUpdate(
            data,
            {
                title: "title",
                salary: "salary",
                equity: "equity",
            });

        const idVarIdx = "$" + (values.length + 1);

        const querySql = `UPDATE jobs 
                      SET ${setCols} 
                      WHERE id = ${idVarIdx} 
                      RETURNING id,
                                title, 
                                salary, 
                                equity,
                                company_handle AS "companyHandle"`;
        const result = await db.query(querySql, [...values, id]);
        const job = result.rows[0];

        if (!job) throw new NotFoundError(`No job: ${id}`);

        return job;
    }

    /** Delete given job from database; returns undefined.
     *
     * Throws NotFoundError if job not found.
     **/

    static async remove(id) {
        const result = await db.query(
            `DELETE
           FROM jobs
           WHERE id = $1
           RETURNING id`,
            [id],
        );
        const job = result.rows[0];

        if (!job) throw new NotFoundError(`No job: ${id}`);
    }
}

module.exports = Job;