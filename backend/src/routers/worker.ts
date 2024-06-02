import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { WORKER_JWT_SECRET } from "..";
import jwt from "jsonwebtoken";
import { workerMiddleware } from "../workerMiddleware";

const prismaClient = new PrismaClient();

const workerRouter = Router();

workerRouter.post("/signin", async (req, res) => {
  const hardCodedWalletAddress = "EX2Rzcw13V3J4baSgJ1CuyzrgsiBmZ5mjF7WTeTgA8Ne";
  const existingUser = await prismaClient.user.findFirst({
    where: {
      address: hardCodedWalletAddress,
    },
  });
  if (existingUser) {
    const token = jwt.sign({ userId: existingUser.id }, WORKER_JWT_SECRET);
    res.json({ token });
  } else {
    const worker = await prismaClient.worker.create({
      data: {
        address: hardCodedWalletAddress,
        pending_amount: 0,
        locked_amount: 0,
      },
    });
    const token = jwt.sign({ userId: worker.id }, WORKER_JWT_SECRET);
    res.json({ token });
  }
});

workerRouter.get("/nextTask", workerMiddleware, async (req, res) => {
  // @ts-ignore
  const userId = req.userId;
  const task = await prismaClient.task.findFirst({
    where: {
      submissions: {
        none: {
          worker_id: userId,
        },
      },
      done: false,
    },
    select: { options: true, title: true },
  });
  if (!task) {
    return res.status(411).json({
      message: "No more tasks for you to review",
    });
  }
  return res.json({ task });
});

workerRouter.post("/submission", workerMiddleware, async (req, res) => {});

export default workerRouter;
