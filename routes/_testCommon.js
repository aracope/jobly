"use strict";

const db = require("../db.js");
const User = require("../models/user");
const Company = require("../models/company");
const Job = require("../models/job")
const { createToken } = require("../helpers/tokens");
let jobId;
// Tokens will be created in `commonBeforeAll` and retrieved via functions
let testUserToken;
let testAdminToken;

async function commonBeforeAll() {
  // Clean out tables
  // noinspection SqlWithoutWhere
  await db.query("DELETE FROM users");
  // noinspection SqlWithoutWhere
  await db.query("DELETE FROM companies");
  await db.query("DELETE FROM jobs");

  // Add companies
  await Company.create(
    {
      handle: "c1",
      name: "C1",
      numEmployees: 1,
      description: "Desc1",
      logoUrl: "http://c1.img",
    });
  await Company.create(
    {
      handle: "c2",
      name: "C2",
      numEmployees: 2,
      description: "Desc2",
      logoUrl: "http://c2.img",
    });
  await Company.create(
    {
      handle: "c3",
      name: "C3",
      numEmployees: 3,
      description: "Desc3",
      logoUrl: "http://c3.img",
    });

  // Add a job
  const job = await Job.create({
    title: "j1",
    salary: 100000,
    equity: "0.05",
    companyHandle: "c1",
  });
  jobId = job.id;

  // Add users
  await User.register({
    username: "u1",
    firstName: "U1F",
    lastName: "U1L",
    email: "user1@user.com",
    password: "password1",
    isAdmin: false,
  });
  await User.register({
    username: "u2",
    firstName: "U2F",
    lastName: "U2L",
    email: "user2@user.com",
    password: "password2",
    isAdmin: false,
  });
  await User.register({
    username: "u3",
    firstName: "U3F",
    lastName: "U3L",
    email: "user3@user.com",
    password: "password3",
    isAdmin: false,
  });
  await User.register({
    username: "admin",
    firstName: "Admin",
    lastName: "User",
    email: "admin@admin.com",
    password: "adminpass",
    isAdmin: true,
  });

  // Create tokens after user creation
  testUserToken = createToken({ username: "u1", isAdmin: false });
  testAdminToken = createToken({ username: "admin", isAdmin: true });
}

async function commonBeforeEach() {
  await db.query("BEGIN");
}

async function commonAfterEach() {
  await db.query("ROLLBACK");
}

async function commonAfterAll() {
  await db.end();
}


module.exports = {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  userToken: () => testUserToken,
  adminToken: () => testAdminToken,
  jobId: () => jobId
};
