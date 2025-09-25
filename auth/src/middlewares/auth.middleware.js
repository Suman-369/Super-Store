const userModel = require("../models/user.model");

const jwt = require("jsonwebtoken");

async function authMiddleware(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: "Unauthorized - No token provided" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await userModel.findById(decoded.id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ error: "Unauthorized - Token expired" });
        } else {
            return res.status(401).json({ error: "Unauthorized - Invalid token" });
        }
    }
}


module.exports = {
    authMiddleware
}