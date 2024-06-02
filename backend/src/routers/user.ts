import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { Router } from "express";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { JWT_SECRET } from "..";
import { authMiddleware } from "../middleware";
import { createTaskInput } from "../types";
import * as dotenv from "dotenv";

dotenv.config();

const DEFAULT_TITLE = "Select the most clickable thumbnail";

//@ts-ignore
const s3Client = new S3Client({
  credentials: {
    accessKeyId: process.env.S3_ACCESS_USER_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  },
  region: "ap-south-1",
});

const userRouter = Router();
const prismaClient = new PrismaClient();

userRouter.post("/task", authMiddleware, async (req, res) => {
  const body = req.body;
  //@ts-ignore
  const userId = req.userId;
  const parseData = createTaskInput.safeParse(body);
  if (!parseData.success) {
    return res.status(411).json({
      message: "You've sent the wrong inputs",
    });
  }
  const response = await prismaClient.$transaction(async (tx) => {
    const response = await prismaClient.task.create({
      data: {
        title: parseData.data.title ?? DEFAULT_TITLE,
        amount: "1",
        signature: parseData.data.signature,
        user_id: userId,
      },
    });
    await tx.option.createMany({
      data: parseData.data.options.map((x) => ({
        image_url: x.imageurl,
        task_id: response.id,
      })),
    });
    return response;
  });
  return res.json({
    id: response.id,
  });
});

userRouter.get("/task", authMiddleware, async (req, res) => {
  // @ts-ignore
  const taskId: string = req.query.taskId;

  // @ts-ignore
  const userId: string = req.userId;

  const taskDetails = await prismaClient.task.findFirst({
    where: {
      user_id: Number(userId),
      id: Number(taskId),
    },
    include: {
      options: true,
    },
  });
  console.log(taskDetails);
  if (!taskDetails) {
    return res.status(411).json({
      message: "You don't have access to this task",
    });
  }
  const responses = await prismaClient.submission.findMany({
    where: {
      task_id: Number(taskId),
    },
    include: {
      option: true,
    },
  });
  const result: Record<
    string,
    {
      count: number;
      option: {
        imageUrl: string;
      };
    }
  > = {};
  taskDetails.options.forEach((option) => {
    result[option.id] = {
      count: 0,
      option: {
        imageUrl: option.image_url,
      },
    };
  });

  responses.forEach((r) => {
    result[r.option_id].count++;
  });
  return res.json({ result });
});

userRouter.post("/signin", async (req, res) => {
  const hardCodedWalletAddress = "EX2Rzcw13V3J4baSgJ1CuyzrgsiBmZ5mjF7WTeTgA8Ne";
  const existingUser = await prismaClient.user.findFirst({
    where: {
      address: hardCodedWalletAddress,
    },
  });
  if (existingUser) {
    const token = jwt.sign({ userId: existingUser.id }, JWT_SECRET);
    res.json({ token });
  } else {
    const user = await prismaClient.user.create({
      data: {
        address: hardCodedWalletAddress,
      },
    });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET);
    res.json({ token });
  }
});

userRouter.get("/presignedurl", authMiddleware, async (req, res) => {
  //@ts-ignore
  const userId = req.userId;
  const { url, fields } = await createPresignedPost(s3Client, {
    Bucket: "mydecentralizedfiver",
    Key: `fiver/${userId}/${Math.random()}/image.jpg`,
    Conditions: [
      ["content-length-range", 0, 5 * 1024 * 1024], // 5 MB max
    ],
    Fields: {
      success_action_status: "201",
      "Content-Type": "image/jpg",
    },
    Expires: 3600,
  });
  return res.json({ preSignedUrl: url, fields: fields });
});

export default userRouter;
