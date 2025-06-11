"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterEach,
    commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
  const newJob = {
    title: "Software Engineer",
    salary: 80000,
    equity: "0.05",
    companyHandle: "c1",
  };

  test("works", async function () {
    const job = await Job.create(newJob);
    console.log("Created job:", job);

    expect(job).toMatchObject({
      title: "Software Engineer",
      salary: 80000,
      equity: "0.05",
      companyHandle: "c1",
    });

    const result = await db.query(
      `SELECT title, salary, equity, company_handle
       FROM jobs
       WHERE title = 'Software Engineer'`);
    expect(result.rows[0]).toEqual({
      title: "Software Engineer",
      salary: 80000,
      equity: "0.05",
      company_handle: "c1",
    });
  });
});

/************************************** findAll */

describe("findAll", function () {
  test("works: no filter", async function () {
    let jobs = await Job.findAll();
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: "j1",
        salary: 100000,
        equity: "0.05",
        companyHandle: "c1",
      },
      {
        id: expect.any(Number),
        title: "j2",
        salary: 120000,
        equity: "0",
        companyHandle: "c2",
      },
      {
        id: expect.any(Number),
        title: "j3",
        salary: 150000,
        equity: null,
        companyHandle: "c3",
      },
    ]);
  });

//   test("returns empty if no matching results", async function () {
//     const result = await Job.findAll({ title: "none" });
//     expect(result).toEqual([]);
//   });

//   test("filters by title", async function () {
//     const result = await Job.findAll({ title: "j1" });
//     expect(result).toEqual([
//       {
//         id: expect.any(Number),
//         title: "j1",
//         salary: 100000,
//         equity: "0.05",
//         companyHandle: "c1",
//       },
//     ]);
//   });

//   test("filters by minSalary", async function () {
//     const result = await Job.findAll({ minSalary: 130000 });
//     expect(result).toEqual([
//       {
//         id: expect.any(Number),
//         title: "j3",
//         salary: 150000,
//         equity: null,
//         companyHandle: "c3",
//       },
//     ]);
//   });

//   test("filters by hasEquity", async function () {
//     const result = await Job.findAll({ hasEquity: true });
//     expect(result).toEqual([
//       {
//         id: expect.any(Number),
//         title: "j1",
//         salary: 100000,
//         equity: "0.05",
//         companyHandle: "c1",
//       },
//     ]);
//   });
});

/************************************** get */

describe("get", function () {
  test("works", async function () {
    const result = await db.query(`SELECT id FROM jobs WHERE title = 'j1'`);
    const jobId = result.rows[0].id;

    let job = await Job.get(jobId);
    expect(job).toEqual({
      id: jobId,
      title: "j1",
      salary: 100000,
      equity: "0.05",
      companyHandle: "c1",
    });
  });

  test("not found if no such job", async function () {
    try {
      await Job.get(999999);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("update", function () {
  test("works", async function () {
    let job = await Job.create({
      title: "Temp",
      salary: 70000,
      equity: "0",
      companyHandle: "c1",
    });

    const updateData = {
      title: "Updated",
      salary: 95000,
      equity: "0.10",
    };

    const updated = await Job.update(job.id, updateData);
    expect(updated).toEqual({
      id: job.id,
      title: "Updated",
      salary: 95000,
      equity: "0.10",
      companyHandle: "c1",
    });

    const result = await db.query(
      `SELECT title, salary, equity, company_handle
       FROM jobs
       WHERE id = $1`, [job.id]);
    expect(result.rows[0]).toEqual({
      title: "Updated",
      salary: 95000,
      equity: "0.10",
      company_handle: "c1",
    });
  });

  test("not found if no such job", async function () {
    try {
      await Job.update(999999, { title: "Nope" });
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    const job = await Job.create({
      title: "NothingToUpdate",
      salary: 75000,
      equity: "0",
      companyHandle: "c1",
    });

    try {
      await Job.update(job.id, {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** remove */

describe("remove", function () {
  test("works", async function () {
    const job = await Job.create({
      title: "ToBeDeleted",
      salary: 90000,
      equity: "0.05",
      companyHandle: "c1",
    });

    await Job.remove(job.id);

    const res = await db.query("SELECT id FROM jobs WHERE id = $1", [job.id]);
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such job", async function () {
    try {
      await Job.remove(999999);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});