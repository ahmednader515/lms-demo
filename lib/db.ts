import { PrismaClient } from "@prisma/client";

declare global {
    // Using var here is required for global declarations
    // eslint-disable-next-line no-var
    var prisma: PrismaClient | undefined;
}

export const db = globalThis.prisma || new PrismaClient();

if(process.env.NODE_ENV !== "production") globalThis.prisma = db;