import { Hono } from "hono";
import { handle } from "hono/vercel";
import connectDB from "@/db/mongodb";

export const runtime = "edge";

await connectDB();

const app = new Hono().basePath("/api");

app
  .get("/login", (c) => {
    return c.json({
      message: "login",
    });
  })
  .get("/users", (c) => {
    return c.json({
      message: "users",
    });
  })
  .get("/users/:id", (c) => {
    const id = c.req.param("id");
    return c.json({
      message: `user ${id}`,
    });
  })
  .post("/users", (c) => {
    return c.json({
      message: "create user",
    });
  })
  .put("/users/:id", (c) => {
    const id = c.req.param("id");
    return c.json({
      message: `update user ${id}`,
    });
  })
  .delete("/users/:id", (c) => {
    const id = c.req.param("id");
    return c.json({
      message: `delete user ${id}`,
    });
  })
  .get("/users/report", (c) => {
    return c.json({
      message: "report",
    });
  });

export const GET = handle(app);
export const POST = handle(app);
export const DELETE = handle(app);
export const PUT = handle(app);
