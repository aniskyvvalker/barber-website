import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

// Load server-specific environment variables from server/.env
dotenv.config({ path: path.join(__dirname, ".env") });
// Use require to load the route so ts-node-dev/CommonJS resolution finds the TypeScript module reliably.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sendEmailRouter = require("./routes/send-email").default;
// Admin routes for server-side admin checks
// eslint-disable-next-line @typescript-eslint/no-var-requires
const adminRouter = require("./routes/admin").default;

const app = express();

// Allow requests only from the dev frontend by default (Vite runs on port 3000).
const allowedOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";
app.use(
    cors({
        origin: allowedOrigin,
    })
);

app.use(express.json({ limit: "16kb" }));

app.use(sendEmailRouter);
app.use(adminRouter);

const port = process.env.PORT || 3001;
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});


