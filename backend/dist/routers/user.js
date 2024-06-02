"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_1 = require("express");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_presigned_post_1 = require("@aws-sdk/s3-presigned-post");
const __1 = require("..");
const middleware_1 = require("../middleware");
const types_1 = require("../types");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const DEFAULT_TITLE = "Select the most clickable thumbnail";
//@ts-ignore
const s3Client = new client_s3_1.S3Client({
    credentials: {
        accessKeyId: process.env.S3_ACCESS_USER_ID,
        secretAccessKey: process.env.SECRET_ACCESS_KEY,
    },
    region: "ap-south-1",
});
const userRouter = (0, express_1.Router)();
const prismaClient = new client_1.PrismaClient();
userRouter.post("/task", middleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const body = req.body;
    //@ts-ignore
    const userId = req.userId;
    const parseData = types_1.createTaskInput.safeParse(body);
    if (!parseData.success) {
        return res.status(411).json({
            message: "You've sent the wrong inputs",
        });
    }
    const response = yield prismaClient.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const response = yield prismaClient.task.create({
            data: {
                title: (_a = parseData.data.title) !== null && _a !== void 0 ? _a : DEFAULT_TITLE,
                amount: "1",
                signature: parseData.data.signature,
                user_id: userId,
            },
        });
        yield tx.option.createMany({
            data: parseData.data.options.map((x) => ({
                image_url: x.imageurl,
                task_id: response.id,
            })),
        });
        return response;
    }));
    return res.json({
        id: response.id,
    });
}));
userRouter.get("/task", middleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // @ts-ignore
    const taskId = req.query.taskId;
    // @ts-ignore
    const userId = req.userId;
    const taskDetails = yield prismaClient.task.findFirst({
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
    const responses = yield prismaClient.submission.findMany({
        where: {
            task_id: Number(taskId),
        },
        include: {
            option: true,
        },
    });
    const result = {};
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
}));
userRouter.post("/signin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const hardCodedWalletAddress = "EX2Rzcw13V3J4baSgJ1CuyzrgsiBmZ5mjF7WTeTgA8Ne";
    const existingUser = yield prismaClient.user.findFirst({
        where: {
            address: hardCodedWalletAddress,
        },
    });
    if (existingUser) {
        const token = jsonwebtoken_1.default.sign({ userId: existingUser.id }, __1.JWT_SECRET);
        res.json({ token });
    }
    else {
        const user = yield prismaClient.user.create({
            data: {
                address: hardCodedWalletAddress,
            },
        });
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, __1.JWT_SECRET);
        res.json({ token });
    }
}));
userRouter.get("/presignedurl", middleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    //@ts-ignore
    const userId = req.userId;
    const { url, fields } = yield (0, s3_presigned_post_1.createPresignedPost)(s3Client, {
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
}));
exports.default = userRouter;
