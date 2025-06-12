"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterEach,
    commonAfterAll,
    userToken,
    adminToken,
    jobId,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

describe("POST /jobs", function () {
    const newJob = {
        title: "Software Engineer",
        salary: 80000,
        equity: "0.05",
        companyHandle: "c1",
    };

    test("creates job if admin user", async function () {
        const resp = await request(app)
            .post("/jobs")
            .send(newJob)
            .set("authorization", `Bearer ${adminToken()}`);
        expect(resp.statusCode).toEqual(201);
        expect(resp.body).toEqual({
            job: {
                id: expect.any(Number),
                ...newJob,
            },
        });
    });

    test("400 if required fields missing", async function () {
        const resp = await request(app)
            .post("/jobs")

            // missing salary & companyHandle
            .send({
                title: "new",
                equity: "0.05",
            })
            .set("authorization", `Bearer ${adminToken()}`);
        expect(resp.statusCode).toEqual(400);
    });

    test("400 if invalid field types", async function () {
        const resp = await request(app)
            .post("/jobs")
            .send({
                ...newJob,
                salary: "not-a-number",
            })
            .set("authorization", `Bearer ${adminToken()}`);
        expect(resp.statusCode).toEqual(400);
    });

    test("401 if non-admin tries to create", async function () {
        const resp = await request(app)
            .post("/jobs")
            .send(newJob)
            // non-admin
            .set("authorization", `Bearer ${userToken()}`);
        expect(resp.statusCode).toEqual(401);
    });

});

/************************************** GET /jobs */

describe("GET /jobs", function () {
    test("ok for anon", async function () {
        const resp = await request(app).get("/jobs");
        expect(resp.body.jobs.length).toBeGreaterThan(0);
        expect(resp.body.jobs[0]).toEqual({
            id: expect.any(Number),
            title: expect.any(String),
            salary: expect.any(Number),
            equity: expect.any(String),
            companyHandle: expect.any(String),
        });
    });

    test("filters by title ", async function () {
        const resp = await request(app).get("/jobs?title=j1");
        expect(resp.body.jobs.every(j => j.title.includes("j1"))).toBe(true);
    });

    test("filters by minSalary", async function () {
        const resp = await request(app).get("/jobs?minSalary=120000");
        expect(resp.body.jobs.every(j => j.salary >= 120000)).toBe(true);
    });

    test("filters by hasEquity=true", async function () {
        const resp = await request(app).get("/jobs?hasEquity=true");
        expect(resp.body.jobs.every(j => parseFloat(j.equity) > 0)).toBe(true);
    });

    test("works with multiple filters together", async function () {
        const resp = await request(app).get("/jobs?minSalary=90000&hasEquity=true");
        expect(resp.body.jobs.every(j =>
            j.salary >= 90000 && parseFloat(j.equity) > 0
        )).toBe(true);
    });

    test("400 for invalid query key", async function () {
        const resp = await request(app)
            .get("/jobs?invalidFilter=xyz")
            .expect(400);
        expect(resp.body.error.message).toEqual("Invalid filter: invalidFilter");
    });

    test("fails: test next() handler", async function () {
        // there's no normal failure event which will cause this route to fail ---
        // thus making it hard to test that the error-handler works with it. This
        // should cause an error, all right :)
        await db.query("DROP TABLE jobs CASCADE");
        const resp = await request(app)
            .get("/jobs")
            .set("authorization", `Bearer ${userToken()}`);
        expect(resp.statusCode).toEqual(500);
    });
});

/************************************** GET /jobs/:id */

describe("GET /jobs/:id", function () {
    test("works for anonymous user", async function () {
        const resp = await request(app).get(`/jobs/${jobId()}`);
        expect(resp.body.job).toEqual({
            id: jobId(),
            title: "j1",
            salary: 100000,
            equity: "0.05",
            companyHandle: "c1",
        });
    });

    test("400 for invalid ID format", async function () {
        const resp = await request(app).get(`/jobs/nope`);
        expect(resp.statusCode).toEqual(400);
    });
});

/************************************** PATCH /jobs/:id */

describe("PATCH /jobs/:id", function () {
    test("updates job if admin user", async function () {
        const resp = await request(app)
            .patch(`/jobs/${jobId()}`)
            .send({ title: "Updated Title" })
            .set("authorization", `Bearer ${adminToken()}`);
        expect(resp.body.job.title).toBe("Updated Title");
    });

    test("401 for anonymous user", async function () {
        const resp = await request(app)
            .patch(`/jobs/${jobId()}`)
            .send({ title: "Nope" });
        expect(resp.statusCode).toEqual(401);
    });

    test("404 for non-existent job ID", async function () {
        const resp = await request(app)
            .patch(`/jobs/0`)
            .send({ title: "Nope" })
            .set("authorization", `Bearer ${adminToken()}`);
        expect(resp.statusCode).toBe(404);
    });

    test("400 for invalid field type", async function () {
        const resp = await request(app)
            .patch(`/jobs/${jobId()}`)
            .send({ salary: "a lot" })
            .set("authorization", `Bearer ${adminToken()}`);
        expect(resp.statusCode).toBe(400);
    });

    test("401 for non-admin user", async function () {
        const resp = await request(app)
            .patch(`/jobs/j1`)
            .send({ name: "Not Allowed" })
            .set("authorization", `Bearer ${userToken()}`);
        expect(resp.statusCode).toEqual(401);
    });
});

/************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", function () {
    test("deletes job if admin user", async function () {
        const resp = await request(app)
            .delete(`/jobs/${jobId()}`)
            .set("authorization", `Bearer ${adminToken()}`);
        expect(resp.body).toEqual({ deleted: jobId().toString() });
    });

    test("401 for anonymous user", async function () {
        const resp = await request(app)
            .delete(`/jobs/${jobId()}`);
        expect(resp.statusCode).toEqual(401);
    });

    test("400 for invalid ID format", async function () {
        const resp = await request(app)
            .delete(`/jobs/nope`)
            .set("authorization", `Bearer ${adminToken()}`);
        expect(resp.statusCode).toEqual(400);
    });

    test("401 for non-admin user deletion", async function () {
        const resp = await request(app)
            .delete(`/jobs/${jobId()}`)
            .set("authorization", `Bearer ${userToken()}`);
        expect(resp.statusCode).toEqual(401);
    });
});