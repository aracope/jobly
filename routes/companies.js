"use strict";

/** Routes for companies. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureLoggedIn } = require("../middleware/auth");
const Company = require("../models/company");

const { ensureAdmin } = require("../middleware/auth");

const companyNewSchema = require("../schemas/companyNew.json");
const companyUpdateSchema = require("../schemas/companyUpdate.json");

const router = new express.Router();


/** POST / { company } =>  { company }
 *
 * company should be { handle, name, description, numEmployees, logoUrl }
 *
 * Returns { handle, name, description, numEmployees, logoUrl }
 *
 * Authorization required: login
 */

router.post("/", ensureAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, companyNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const company = await Company.create(req.body);
    return res.status(201).json({ company });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET / =>
 *   Returns a list of companies, optionally filtered by query parameters.
 *
 * Query Parameters (all optional):
 * - minEmployees (integer): Return companies with at least this many employees.
 * - maxEmployees (integer): Return companies with at most this many employees.
 * - nameLike (string): Case-insensitive, partial match on company name.
 *
 * If both minEmployees and maxEmployees are provided, minEmployees must be <= maxEmployees,
 * otherwise a BadRequestError is thrown.
 *
 * Returns:
 *   { companies: [ { handle, name, description, numEmployees, logoUrl }, ... ] }
 *
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
  try {
    const q = req.query;

    // Define allowed filter keys
    const allowedFilters = ["minEmployees", "maxEmployees", "nameLike"];

    // Check for any unexpected filters
    for (let key of Object.keys(q)) {
      if (!allowedFilters.includes(key)) {
        throw new BadRequestError(`Invalid filter: ${key}`);
      }
    }

    // Convert string values to numbers if needed
    if (q.minEmployees !== undefined) q.minEmployees = +q.minEmployees;
    if (q.maxEmployees !== undefined) q.maxEmployees = +q.maxEmployees;

    // Rename nameLike to name for filtering
    if (q.nameLike !== undefined) {
      q.name = q.nameLike;
      delete q.nameLike;
    }

    if (q.minEmployees !== undefined && q.maxEmployees !== undefined) {
      if (q.minEmployees > q.maxEmployees) {
        throw new BadRequestError("minEmployees cannot be greater than maxEmployees");
      }
    }

    const companies = await Company.findAll(q);
    return res.json({ companies });
  } catch (err) {
    return next(err);
  }
});

/** GET /[handle]  =>  { company }
 *
 *  Company is { handle, name, description, numEmployees, logoUrl, jobs }
 *   where jobs is [{ id, title, salary, equity }, ...]
 *
 * Authorization required: none
 */

router.get("/:handle", async function (req, res, next) {
  try {
    const company = await Company.get(req.params.handle);
    return res.json({ company });
  } catch (err) {
    return next(err);
  }
});

/** PATCH /[handle] { fld1, fld2, ... } => { company }
 *
 * Patches company data.
 *
 * fields can be: { name, description, numEmployees, logoUrl }
 *
 * Returns { handle, name, description, numEmployees, logoUrl }
 *
 * Authorization required: login
 */

router.patch("/:handle", ensureAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, companyUpdateSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const company = await Company.update(req.params.handle, req.body);
    return res.json({ company });
  } catch (err) {
    return next(err);
  }
});

/** DELETE /[handle]  =>  { deleted: handle }
 *
 * Authorization: login
 */

router.delete("/:handle", ensureAdmin, async function (req, res, next) {
  try {
    await Company.remove(req.params.handle);
    return res.json({ deleted: req.params.handle });
  } catch (err) {
    return next(err);
  }
});


module.exports = router;
