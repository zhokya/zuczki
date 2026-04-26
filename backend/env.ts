import dotenv from "dotenv";
import path from "path";
dotenv.config({
    path: path.resolve(process.cwd(), ".env"),
    quiet: true
});

export default function env(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required env variable: ${name}`);
    }
    return value;
}
