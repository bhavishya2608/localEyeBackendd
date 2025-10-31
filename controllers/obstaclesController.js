const { success, error } = require("../utils/responseWrapper");
const Obstacle = require("../models/Obstacles");
const { v2: cloudinary } = require("cloudinary");
const axios = require("axios");
const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

/**
 * GET all obstacles (admin or general view)
 */
const getObstaclesController = async (req, res) => {
  try {
    const obstacledata = await Obstacle.find().sort({ createdAt: -1 });
    return res.send(success(200, { obstacledata }));
  } catch (err) {
    console.error(err);
    return res.send(error(500, "Failed to fetch obstacles"));
  }
};

/**
 * SUBMIT a new obstacle report
 * Verifies the uploaded image using Gemini AI before saving
 */
const submitObstaclesController = async (req, res) => {
  try {
    const { email, obstacleType, lat, lng } = req.body;
    if (!req.file) return res.send(error(400, "Image file is required"));

    const imageUrl = req.file.path;
    const publicId = req.file.filename;

    // console.log(
    //   "🔑 GEMINI key:",
    //   process.env.GEMINI_API_KEY ? "✅ Loaded" : "❌ Missing"
    // );

    // Download image and convert to base64
    const imageResp = await axios.get(imageUrl, { responseType: "arraybuffer" });
    const base64Image = Buffer.from(imageResp.data).toString("base64");

    const prompt = `
      You are an AI verifying civic issue reports.
      The reporter claims this image represents a "${obstacleType}".
      Analyze the image carefully and respond ONLY in valid JSON (no markdown, no extra text):
      {
        "isValid": true/false,
        "reason": "short explanation why"
      }
    `;

    // ✅ Correct Gemini 2.5 Flash API usage
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          ],
        },
      ],
    });

    const geminiText = response.output_text || response.text || "";
    // console.log("🔍 Gemini Response:", geminiText);

    // ✅ Safe JSON extraction
    let verification = { isValid: false, reason: "Invalid JSON from Gemini" };
    try {
      const match = geminiText.match(/{[\s\S]*}/);
      if (match) {
        verification = JSON.parse(match[0]);
      } else {
        console.warn("⚠️ Gemini output did not contain JSON:", geminiText);
      }
    } catch (parseErr) {
      console.error("❌ Failed to parse Gemini response:", parseErr.message);
    }

    // ✅ If Gemini rejects, clean up Cloudinary image
    if (!verification.isValid) {
      await cloudinary.uploader.destroy(publicId);
      return res.send(error(400, `${verification.reason}`));
    }

    // ✅ Save verified obstacle
    const obstacle = await Obstacle.create({
      obstacleType,
      path: imageUrl,
      filename: publicId,
      email,
      lat,
      lng,
      status: "pending",
      verified: true,
      verificationReason: verification.reason,
    });

    return res.send(success(200, { obstacle }));
  } catch (err) {
    console.error("❌ Error verifying or saving obstacle:", err);
    return res.send(error(500, "Error submitting obstacle"));
  }
};

/**
 * GET all obstacles reported by a specific user
 */
const userObstaclesController = async (req, res) => {
  try {
    const { email } = req.headers;
    const data = await Obstacle.find({ email }).sort({ createdAt: -1 });
    return res.send(success(200, { data }));
  } catch (err) {
    console.error(err);
    return res.send(error(500, "Failed to fetch user's reports"));
  }
};

/**
 * UPDATE the status of an obstacle report
 */
const updateObstacleStatusController = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ["pending", "in_progress", "resolved"];
    if (!allowed.includes(String(status))) {
      return res.send(error(400, "Invalid status"));
    }

    const updated = await Obstacle.findByIdAndUpdate(
      id,
      { status: String(status) },
      { new: true }
    );

    if (!updated) {
      return res.send(error(404, "Report not found"));
    }

    return res.send(success(200, { obstacle: updated }));
  } catch (err) {
    console.error(err);
    return res.send(error(500, err.message));
  }
};

module.exports = {
  getObstaclesController,
  submitObstaclesController,
  userObstaclesController,
  updateObstacleStatusController,
};
