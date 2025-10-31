import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

async function testGemini() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });


    const result = await model.generateContent("Say 'Hello from Gemini 2.5 Flash!'");
    console.log("✅ Gemini Response:", result.response.text());
  } catch (err) {
    console.error("❌ Gemini test failed:", err);
  }
}

testGemini();
