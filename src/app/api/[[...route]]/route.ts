/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Hono } from "hono";
import { handle } from "hono/vercel";
import connectDB from "@/db/mongodb";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import User from "@/models/User";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import { env } from "@/env";
import { sign, jwt } from "hono/jwt";
import { Parser } from "json2csv";

await connectDB();

type Variables = {
  id: string;
  name: string;
  level: 1 | 2 | 3 | 4 | 5;
  exp: number;
};

const app = new Hono<{ Variables: Variables }>().basePath("/api");

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "the password must be longer then 8 characters"),
});

const createUserSchema = z.object({
  name: z
    .string()
    .min(2, "the name must be longer then 2 characters")
    .max(50, "the name must be shorter then 50 characters"),
  email: z.string().email(),
  password: z.string().min(8, "the password must be longer then 8 characters"),
  level: z
    .number()
    .nonnegative("the level cannot be negative")
    .max(5, "the max level is 5"),
});

const updateUserSchema = z.object({
  name: z
    .string()
    .min(2, "the name must be longer then 2 characters")
    .max(50, "the name must be shorter then 50 characters")
    .optional(),
  email: z.string().email().optional(),
  password: z
    .string()
    .min(8, "the password must be longer then 8 characters")
    .optional(),
  level: z
    .number()
    .nonnegative("the level cannot be negative")
    .max(5, "the max level is 5")
    .optional(),
});

app
  .post("/login", zValidator("json", loginSchema), async (c) => {
    const { email, password } = c.req.valid("json");

    try {
      const user = await User.findOne({ email });

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return c.json({ message: "Invalid credentials" }, 401);
      }

      const payload = {
        id: user.id,
        name: user.name,
        level: user.level,
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
      };

      const token = await sign(payload, env.JWT_SECRET);

      return c.json({ data: token });
    } catch (error: unknown) {
      if (error instanceof Error) {
        return c.json({ message: error.message }, 500);
      }
      return c.json({ message: "An unknown error occurred" }, 500);
    }
  })
  .get("/users", async (c) => {
    try {
      const users = await User.find({});
      return c.json({ data: users }, 200);
    } catch (error: unknown) {
      if (error instanceof Error) {
        return c.json({ message: error.message }, 500);
      }
      return c.json({ message: "An unknown error occurred" }, 500);
    }
  })
  .get(
    "/users/report",
    jwt({
      secret: env.JWT_SECRET,
    }),
    async (c) => {
      const payload = c.get("jwtPayload") as Variables;

      if (payload.level <= 4) {
        return c.json({ message: "user level must be grater than 4" }, 401);
      }

      try {
        const users = await User.find({});
        console.log(users);

        const fields = ["id", "name", "email", "password", "level"];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(users);

        const buffer = Buffer.from(csv, "utf-8");

        const arrayBuffer = buffer.buffer.slice(
          buffer.byteOffset,
          buffer.byteOffset + buffer.byteLength,
        );

        c.header("Content-Type", "text/csv");
        c.header(
          "Content-Disposition",
          'attachment; filename="users_report.csv"',
        );

        return c.body(arrayBuffer);
      } catch (error: unknown) {
        if (error instanceof Error) {
          return c.json(
            {
              success: false,
              data: {
                message: error.message,
              },
            },
            500,
          );
        }
        return c.json(
          {
            success: false,
            data: {
              message: "An unknown error occurred",
            },
          },
          500,
        );
      }
    },
  )
  .get("/users/:id", async (c) => {
    const userId = c.req.param("id");

    try {
      const user = await User.findOne({ id: userId });

      if (!user) {
        return c.json({ message: "User not found" }, 404);
      }

      return c.json({ data: user });
    } catch (error: unknown) {
      if (error instanceof Error) {
        return c.json({ message: error.message }, 500);
      }
      return c.json({ message: "An unknown error occurred" }, 500);
    }
  })
  .post("/users", zValidator("json", createUserSchema), async (c) => {
    const { name, email, password, level } = c.req.valid("json");
    const id = uuidv4();

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({
        id,
        name,
        email,
        password: hashedPassword,
        level,
      });
      await newUser.save();
      return c.json({
        success: true,
        data: newUser,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        return c.json(
          {
            success: false,
            data: {
              message: error.message,
            },
          },
          500,
        );
      }
      return c.json(
        {
          success: false,
          data: {
            message: "An unknown error occurred",
          },
        },
        500,
      );
    }
  })
  .put("/users/:id", zValidator("json", updateUserSchema), async (c) => {
    const id = c.req.param("id");
    const { name, email, level, password } = c.req.valid("json");

    try {
      const updatedUser = await User.findOneAndUpdate(
        { id },
        { name, email, level, password },
        {
          new: true,
        },
      );
      return c.json({
        success: true,
        data: updatedUser,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        return c.json(
          {
            success: false,
            data: {
              message: error.message,
            },
          },
          500,
        );
      }
      return c.json(
        {
          success: false,
          data: {
            message: "An unknown error occurred",
          },
        },
        500,
      );
    }
  })
  .delete("/users/:id", async (c) => {
    const id = c.req.param("id");

    try {
      const deletedUser = await User.findOneAndDelete({ id });
      if (!deletedUser) {
        return c.json(
          {
            success: false,
            data: {
              message: "User not found",
            },
          },
          404,
        );
      }
      return c.json({
        success: true,
        data: deletedUser,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        return c.json(
          {
            success: false,
            data: {
              message: error.message,
            },
          },
          500,
        );
      }
      return c.json(
        {
          success: false,
          data: {
            message: "An unknown error occurred",
          },
        },
        500,
      );
    }
  });

export const GET = handle(app);
export const POST = handle(app);
export const DELETE = handle(app);
export const PUT = handle(app);
