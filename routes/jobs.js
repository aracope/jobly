"use strict";

/** Routes for jobs. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");

const Job = require("../models/job");

const { ensureAdmin } = require("../middleware/auth.js");

const jobSearchSchema = require("../schemas/jobSearch.json");
const jobNewSchema = require("../schemas/jobNew.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");



const router = new express.Router();


/** POST / { job } =>  { job }
 *
 * job should be { id, title, salary, equity, companyHandle }
 *
 * Returns { id, title, salary, equity, companyHandle }
 *
 * Authorization required: admin
 */

router.post("/", ensureAdmin, async function (req, res, next) {
    try {
        const validator = jsonschema.validate(req.body, jobNewSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const job = await Job.create(req.body);
        return res.status(201).json({ job });
    } catch (err) {
        return next(err);
    }
});

/** GET / =>
 *   Returns a list of jobs, optionally filtered by query parameters.
 *
 * Query Parameters (all optional):
 * - title (string): Case-insensitive, partial match on job title.
 * - minSalary (integer): Return jobs with at least this salary.
 * - hasEquity (boolean): If true, only return jobs with non-zero equity.
 *
 * Returns:
 *   { jobs: [ { id, title, salary, equity, companyHandle }, ... ] }
 *
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
    try {
        // Convert string values
        if (req.query.minSalary !== undefined) {
            req.query.minSalary = +req.query.minSalary;
        }
        if (req.query.hasEquity !== undefined) {
            req.query.hasEquity = req.query.hasEquity === "true";
        }
        // Define allowed filters
        const allowedFilters = new Set(["title", "minSalary", "hasEquity"]);

        // Check for unknown query keys BEFORE jsonschema
        for (let key of Object.keys(req.query)) {
            if (!allowedFilters.has(key)) {
                throw new BadRequestError(`Invalid filter: ${key}`);
            }
        }

        const validator = jsonschema.validate(req.query, jobSearchSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const q = req.query;

        // Now use q for filtering and validation
        for (let key of Object.keys(q)) {
            if (!allowedFilters.has(key)) {
                throw new BadRequestError(`Invalid filter: ${key}`);
            }
        }

        const jobs = await Job.findAll(q);
        return res.json({ jobs });
    } catch (err) {
        return next(err);
    }
});

/** GET /[id]  =>  { job }
 *
 *  Job is { id, title, salary, equity, companyHandle }
 *
 * Authorization required: none
 */


router.get("/:id", async function (req, res, next) {
    try {
        const job = await Job.get(req.params.id);
        return res.json({ job });
    } catch (err) {
        return next(err);
    }
});

/** PATCH /[id] { fld1, fld2, ... } => { job }
 *
 * Patches job data.
 *
 * Data can include: { title, salary, equity }
 *
 * Returns { id, title, salary, equity, companyHandle }
 *
 * Authorization required: admin
 */

router.patch("/:id", ensureAdmin, async function (req, res, next) {
    try {
        const validator = jsonschema.validate(req.body, jobUpdateSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const job = await Job.update(req.params.id, req.body);
        return res.json({ job });
    } catch (err) {
        return next(err);
    }
});

/** DELETE /[id]  =>  { deleted: id }
 *
 * Authorization required: admin
 */

router.delete("/:id", ensureAdmin, async function (req, res, next) {
    try {
        await Job.remove(req.params.id);
        return res.json({ deleted: req.params.id });
    } catch (err) {
        return next(err);
    }
});


module.exports = router;