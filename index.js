require("dotenv").config();
const express = require("express");

const app = express();

/* =========================
   CONFIG
========================= */
const PORT = Number(process.env.PORT) || 4000;
const NODE_ENV = process.env.NODE_ENV || "development";

/* =========================
   MIDDLEWARE
========================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   ROUTES
========================= */

// Health check (rất quan trọng cho deploy / monitoring)
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        env: NODE_ENV,
        time: new Date().toISOString()
    });
});

// Root
app.get("/", (req, res) => {
    res.json({
        message: "Backend is running 🚀",
        env: NODE_ENV
    });
});

/* =========================
   404 HANDLER
========================= */
app.use((req, res) => {
    res.status(404).json({
        message: "Route not found"
    });
});

/* =========================
   ERROR HANDLER
========================= */
app.use((err, req, res, next) => {
    console.error("❌ Error:", err);
    res.status(500).json({
        message: "Internal server error"
    });
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
    console.log(
        `🚀 Backend started | env=${NODE_ENV} | port=${PORT}`
    );
});
