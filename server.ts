import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-loaded Gemini AI client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not defined in the environment secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Helper to call generateContent with automatic model fallback if gemini-3.5-flash is temporarily unavailable (503)
async function generateContentWithFallback(ai: GoogleGenAI, params: any) {
  try {
    return await ai.models.generateContent(params);
  } catch (error: any) {
    const errorStr = (typeof error === 'object' && error !== null) ? (JSON.stringify(error) || error?.message || "") : String(error);
    const isTemporaryError = 
      errorStr.includes("503") || 
      errorStr.includes("UNAVAILABLE") || 
      errorStr.includes("demand") ||
      error?.status === 503;
      
    if (isTemporaryError && params.model === "gemini-3.5-flash") {
      console.warn("gemini-3.5-flash returned 503/UNAVAILABLE. Retrying with gemini-flash-latest fallback...");
      const fallbackParams = { ...params, model: "gemini-flash-latest" };
      return await ai.models.generateContent(fallbackParams);
    }
    throw error;
  }
}

// 1. API: Vent / Overwhelm Coaching ("The Last-Minute Life Saver" Persona)
app.post("/api/coach-overwhelm", async (req, res) => {
  try {
    const { ventText, localTime } = req.body;
    if (!ventText) {
      return res.status(400).json({ error: "ventText is required" });
    }

    const ai = getGeminiClient();
    const systemInstruction = 
      "You are 'The Last-Minute Life Saver'—an aggressive, hyper-proactive, slightly intense but deeply caring productivity coach. " +
      "The user is panicking or feeling extremely overwhelmed about upcoming deadlines. " +
      "Your objective is to cut through their stress with complete bluntness, extreme focus, and a direct visual plan. " +
      "Analyze their situation, provide an aggressive, high-energy motivational quote, assign a panic level, " +
      "and declare the ONE single most critical action they must complete in the next 15 minutes. " +
      "Then, list 3-5 specific, small chronological micro-steps with time costs (in minutes) to tackle their work immediately.";

    const prompt = `Current Local Time: ${localTime || new Date().toISOString()}\nUser's vent / description of stress:\n"${ventText}"`;

    const response = await generateContentWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: {
              type: Type.STRING,
              description: "A blunt, intense, but highly targeted overview of their situation. Acknowledge how bad it is but tell them exactly how we are going to fix it right now."
            },
            motivationalQuote: {
              type: Type.STRING,
              description: "An aggressive, humorous, or intense motivational quote that forces them to act immediately. Avoid corporate fluff."
            },
            panicLevel: {
              type: Type.STRING,
              description: "Must be exactly one of: 'MODERATE', 'HIGH', or 'CRITICAL'."
            },
            criticalAction: {
              type: Type.STRING,
              description: "A single, highly specific task they can start in the next 10-15 minutes (e.g. 'Open GitHub and create a draft PR', 'Open Google Slides and write titles for 4 slides')."
            },
            microSteps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  step: { type: Type.STRING, description: "A tiny, concrete actionable task." },
                  durationMinutes: { type: Type.INTEGER, description: "Duration in minutes" },
                  description: { type: Type.STRING, description: "A detailed breakdown of how to execute this specific step as quickly as possible." }
                },
                required: ["step", "durationMinutes", "description"]
              },
              description: "A chronologically ordered set of 3 to 5 micro steps."
            }
          },
          required: ["analysis", "motivationalQuote", "panicLevel", "criticalAction", "microSteps"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response received from Gemini.");
    }

    res.json(JSON.parse(resultText.trim()));
  } catch (error: any) {
    console.error("Error in coach-overwhelm:", error);
    res.status(500).json({ error: error?.message || "Internal server error during coaching analysis." });
  }
});

// 2. API: Parse Gmail emails for deadlines
app.post("/api/analyze-emails", async (req, res) => {
  try {
    const { emails } = req.body;
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.json({ deadlines: [] });
    }

    const ai = getGeminiClient();
    const systemInstruction = 
      "You are an expert deadline detective. Read through the provided email snippets " +
      "to detect implicit or explicit deadlines, urgent follow-up tasks, assignments, or project targets. " +
      "Extract files to draft, client meetings, or teacher requests. " +
      "Generate an itemized summary list in JSON format, capturing where the deadline was hidden, " +
      "the associated urgency detail, and a smart proactive action the user should take right now.";

    const prompt = `Here are the latest emails from the user's inbox:\n${JSON.stringify(emails)}`;

    const response = await generateContentWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            deadlines: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "Pass through the email ID provided." },
                  subject: { type: Type.STRING, description: "Subject of the email thread." },
                  sender: { type: Type.STRING, description: "Sender of the email." },
                  date: { type: Type.STRING, description: "Date of the email." },
                  detectedDeadline: { type: Type.STRING, description: "The identified deadline/target date, or 'Unspecified'." },
                  urgency: { type: Type.STRING, description: "Must be 'low', 'medium', or 'high'." },
                  summary: { type: Type.STRING, description: "A clean 1-2 sentence summary of what the request represents." },
                  recommendedAction: { type: Type.STRING, description: "A direct immediate step the user should take to respond or prepare." }
                },
                required: ["id", "subject", "sender", "date", "detectedDeadline", "urgency", "summary", "recommendedAction"]
              }
            }
          },
          required: ["deadlines"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Failed to receive structured deadlines from Gemini.");
    }

    res.json(JSON.parse(resultText.trim()));
  } catch (error: any) {
    console.error("Error in analyze-emails:", error);
    res.status(500).json({ error: error?.message || "Internal server error parsing emails." });
  }
});

// 3. API: Recommend Focus Work Blocks based on Free Slots and Calendars
app.post("/api/suggest-focus-schedule", async (req, res) => {
  try {
    const { taskTitle, deadline, calendarEvents, localTime } = req.body;
    if (!taskTitle) {
      return res.status(400).json({ error: "taskTitle is required" });
    }

    const ai = getGeminiClient();
    const systemInstruction = 
      "You are a master of time blocking. Your task is to recommend one or two highly targeted 2-hour 'Deep Work Blocks' " +
      "to help the user finish their deadline prior to the specified target. " +
      "You must look at the user's existing calendar events to ensure there are NO overlapping times. " +
      "Pick slots during reasonable waking hours (8:00 AM to 10:00 PM) starting from the current local time. " +
      "Return the details in JSON form, including a strong personalized rationale for why this timezone works.";

    const prompt = 
      `Current Time: ${localTime || new Date().toISOString()}\n` +
      `Task Topic: ${taskTitle}\n` +
      `Estimated Deadline: ${deadline || "ASAP"}\n` +
      `Existing Calendar Events (Busy Times):\n${JSON.stringify(calendarEvents)}`;

    const response = await generateContentWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            proposedSlots: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "The title for the proposed event, e.g. 'DEEP WORK: [Task Title]'" },
                  startTime: { type: Type.STRING, description: "The start time of the 2-hour slot in ISO 8601 string format (incorporate same timezone as localTime)." },
                  endTime: { type: Type.STRING, description: "The end time of the 2-hour slot (ISO 8601 string, exactly 2 hours after startTime)." },
                  rationale: { type: Type.STRING, description: "A high-personality direct quote why this block was chosen, referencing their calendar gaps or time of day." }
                },
                required: ["title", "startTime", "endTime", "rationale"]
              }
            }
          },
          required: ["proposedSlots"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Failed to receive suggested blocks from Gemini.");
    }

    res.json(JSON.parse(resultText.trim()));
  } catch (error: any) {
    console.error("Error in suggest-focus-schedule:", error);
    res.status(500).json({ error: error?.message || "Internal server error suggesting focus slots." });
  }
});

// 4. API: Generate Pre-work or Extension Request Drafts
app.post("/api/draft-prework", async (req, res) => {
  try {
    const { context, type } = req.body;
    if (!context || !type) {
      return res.status(400).json({ error: "context and type are required" });
    }

    const ai = getGeminiClient();
    let instruction = "";

    if (type === "prep_doc") {
      instruction = 
        "Generate a meeting preparation document or deep-dive prework study sheet based on the context. " +
        "It must include: 1. Target Objectives. 2. A 3-sentence background context summary. 3. Three bulleted key talking points or arguments. 4. A list of 3 potential hard questions the user might face and recommended immediate bulleted answers.";
    } else if (type === "introduction") {
      instruction = 
        "Generate a highly persuasive, friendly, and structured introduction or kickoff email. " +
        "Ask to align on immediate project requirements and schedule an onboarding session. " +
        "Make it direct, completely professional, with structural clean formatting.";
    } else if (type === "extension_request") {
      instruction = 
        "Generate an incredibly polite, respectful, yet highly professional 'Extension Request' email to a manager or teacher. " +
        "Acknowledge the current deadline is approaching fast and express absolute accountability. " +
        "Politely explain that in order to deliver the highest standard of work and resolve technical or coordination blockers, " +
        "you draft a tiny request for a short extension (e.g., 24-48 hours) while highlighting what has already been completed " +
        "and when the finalized delivery will occur. Keep it very conversational but respectful.";
    }

    const response = await generateContentWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents: `Draft for: ${context}`,
      config: {
        systemInstruction: instruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "A neat title for the document or subject line for the email." },
            content: { type: Type.STRING, description: "The entire drafted textual content in formatted lines. Keep it conversational, fully fleshed out, with clear placeholders (like [Your Name]) for the user to customize." }
          },
          required: ["title", "content"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Failed to receive draft from Gemini.");
    }

    res.json(JSON.parse(resultText.trim()));
  } catch (error: any) {
    console.error("Error in draft-prework:", error);
    res.status(500).json({ error: error?.message || "Internal server error drafting prework." });
  }
});

// Configure Vite middleware for development or fallback in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    // Mount Vite dev server HTML serving router AFTER our APIs
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Serve client SPA router
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Life Saver Backend] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
