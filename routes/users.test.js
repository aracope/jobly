"use strict";

const request = require("supertest");

const db = require("../db.js");
const app = require("../app");
const User = require("../models/user");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  userToken,
  adminToken,
  jobId
} = require("./_testCommon");

const { ensureAdmin, ensureLoggedIn, ensureCorrectUserOrAdmin } = require("../middleware/auth.js");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /users */

describe("POST /users", function () {
  test("works for users: create non-admin", async function () {
    const resp = await request(app)
      .post("/users")
      .send({
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-new",
        password: "password-new",
        email: "new@email.com",
        isAdmin: false,
      })
      .set("authorization", `Bearer ${adminToken()}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      user: {
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-new",
        email: "new@email.com",
        isAdmin: false,
      }, token: expect.any(String),
    });
  });

  test("works for users: create admin", async function () {
    const resp = await request(app)
      .post("/users")
      .send({
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-new",
        password: "password-new",
        email: "new@email.com",
        isAdmin: true,
      })
      .set("authorization", `Bearer ${adminToken()}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      user: {
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-new",
        email: "new@email.com",
        isAdmin: true,
      }, token: expect.any(String),
    });
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
      .post("/users")
      .send({
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-new",
        password: "password-new",
        email: "new@email.com",
        isAdmin: true,
      });
    expect(resp.statusCode).toEqual(401);
  });

  test("bad request if missing data", async function () {
    const resp = await request(app)
      .post("/users")
      .send({
        username: "u-new",
      })
      .set("authorization", `Bearer ${adminToken()}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request if invalid data", async function () {
    const resp = await request(app)
      .post("/users")
      .send({
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-new",
        password: "password-new",
        email: "not-an-email",
        isAdmin: true,
      })
      .set("authorization", `Bearer ${adminToken()}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /users */

describe("GET /users", function () {
  test("works for users", async function () {
    const resp = await request(app)
      .get("/users")
      .set("authorization", `Bearer ${adminToken()}`);
    expect(resp.body).toEqual({
      users: [
        {
          username: "admin",
          firstName: "Admin",
          lastName: "User",
          email: "admin@admin.com",
          isAdmin: true,
        },
        {
          username: "u1",
          firstName: "U1F",
          lastName: "U1L",
          email: "user1@user.com",
          isAdmin: false,
        },
        {
          username: "u2",
          firstName: "U2F",
          lastName: "U2L",
          email: "user2@user.com",
          isAdmin: false,
        },
        {
          username: "u3",
          firstName: "U3F",
          lastName: "U3L",
          email: "user3@user.com",
          isAdmin: false,
        },
      ],
    });
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
      .get("/users");
    expect(resp.statusCode).toEqual(401);
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE users CASCADE");
    const resp = await request(app)
      .get("/users")
      .set("authorization", `Bearer ${adminToken()}`);
    expect(resp.statusCode).toEqual(500);
  });
});

/************************************** GET /users/:username */

describe("GET /users/:username", function () {
  test("works for users", async function () {
    const resp = await request(app)
      .get(`/users/u1`)
      .set("authorization", `Bearer ${userToken()}`);
    expect(resp.body).toEqual({
      user: {
        username: "u1",
        firstName: "U1F",
        lastName: "U1L",
        email: "user1@user.com",
        isAdmin: false,
        jobs: []
      },
    });
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
      .get(`/users/u1`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found if user not found", async function () {
    const resp = await request(app)
      .get(`/users/nope`)
      .set("authorization", `Bearer ${userToken()}`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /users/:username */

describe("PATCH /users/:username", () => {
  test("works for admin", async function () {
    const resp = await request(app)
      .patch(`/users/u1`)
      .send({
        firstName: "New",
      })
      .set("authorization", `Bearer ${adminToken()}`);
    expect(resp.body).toEqual({
      user: {
        username: "u1",
        firstName: "New",
        lastName: "U1L",
        email: "user1@user.com",
        isAdmin: false,
      },
    });
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
      .patch(`/users/u1`)
      .send({
        firstName: "New",
      });
    expect(resp.statusCode).toEqual(401);
  });

  test("not found if no such user", async function () {
    const resp = await request(app)
      .patch(`/users/nope`)
      .send({
        firstName: "Nope",
      })
      .set("authorization", `Bearer ${adminToken()}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request if invalid data", async function () {
    const resp = await request(app)
      .patch(`/users/u1`)
      .send({
        firstName: 42,
      })
      .set("authorization", `Bearer ${userToken()}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("works: set new password", async function () {
    const resp = await request(app)
      .patch(`/users/u1`)
      .send({
        password: "new-password",
      })
      .set("authorization", `Bearer ${userToken()}`);
    expect(resp.body).toEqual({
      user: {
        username: "u1",
        firstName: "U1F",
        lastName: "U1L",
        email: "user1@user.com",
        isAdmin: false,
      },
    });
    const isSuccessful = await User.authenticate("u1", "new-password");
    expect(isSuccessful).toBeTruthy();
  });

  test("forbidden if non-admin tries to patch another user", async function () {
    const resp = await request(app)
      .patch(`/users/u2`)
      .send({ firstName: "Hacker" })
      .set("authorization", `Bearer ${userToken()}`);
    expect(resp.statusCode).toEqual(401);
  });

});

/************************************** DELETE /users/:username */

describe("DELETE /users/:username", function () {
  test("works for admin", async function () {
    const resp = await request(app)
      .delete(`/users/u1`)
      .set("authorization", `Bearer ${adminToken()}`);
    expect(resp.body).toEqual({ deleted: "u1" });
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
      .delete(`/users/u1`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found if user missing", async function () {
    const resp = await request(app)
      .delete(`/users/nope`)
      .set("authorization", `Bearer ${adminToken()}`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** POST /users/:username/jobs/:id */

describe("POST /users/:username/jobs/:id", function () {
  test("works for correct user", async function () {

    // Create a job
    const result = await db.query(`
    INSERT INTO jobs (title, salary, equity, company_handle)
    VALUES ('Test Job User', 50000, '0', 'c1')
    RETURNING id`);

    // Apply as correct user
    const resp = await request(app)
      .post(`/users/u1/jobs/${jobId()}`)
      .set("authorization", `Bearer ${userToken()}`);

    expect(resp.body).toEqual({ applied: jobId() });
  });

  test("works for admin", async function () {
    // Create another job
    const result = await db.query(`
    INSERT INTO jobs (title, salary, equity, company_handle)
    VALUES ('Test Job Admin', 60000, '0', 'c1')
    RETURNING id`);
    const newJobId = result.rows[0].id;

    const resp = await request(app)
      .post(`/users/u2/jobs/${newJobId}`)
      .set("authorization", `Bearer ${adminToken()}`);
    expect(resp.body).toEqual({ applied: newJobId });
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
      .post(`/users/u1/jobs/1`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for wrong user", async function () {
    const resp = await request(app)
      .post(`/users/u2/jobs/1`)
      .set("authorization", `Bearer ${userToken()}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such user", async function () {
    const resp = await request(app)
      .post(`/users/nope/jobs/1`)
      .set("authorization", `Bearer ${adminToken()}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("not found for no such job", async function () {
    const resp = await request(app)
      .post(`/users/u1/jobs/9999`)
      .set("authorization", `Bearer ${adminToken()}`);
    expect(resp.statusCode).toEqual(404);
  });
});
