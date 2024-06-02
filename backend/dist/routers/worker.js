"use strict";
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
const express_1 = require("express");
const client_1 = require("@prisma/client");
const __1 = require("..");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const workerMiddleware_1 = require("../workerMiddleware");
const prismaClient = new client_1.PrismaClient();
const workerRouter = (0, express_1.Router)();
workerRouter.post("/signin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const hardCodedWalletAddress = "EX2Rzcw13V3J4baSgJ1CuyzrgsiBmZ5mjF7WTeTgA8Ne";
    const existingUser = yield prismaClient.user.findFirst({
        where: {
            address: hardCodedWalletAddress,
        },
    });
    if (existingUser) {
        const token = jsonwebtoken_1.default.sign({ userId: existingUser.id }, __1.WORKER_JWT_SECRET);
        res.json({ token });
    }
    else {
        const worker = yield prismaClient.worker.create({
            data: {
                address: hardCodedWalletAddress,
                pending_amount: 0,
                locked_amount: 0,
            },
        });
        const token = jsonwebtoken_1.default.sign({ userId: worker.id }, __1.WORKER_JWT_SECRET);
        res.json({ token });
    }
}));
workerRouter.get("/nextTask", workerMiddleware_1.workerMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // @ts-ignore
    const userId = req.userId;
    const task = yield prismaClient.task.findFirst({
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
}));
exports.default = workerRouter;
