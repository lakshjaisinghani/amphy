import { GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';
import type { AISettings } from './types';

const MAX_LOCAL_LLM_PROMPT_TOKENS = 1024;
const GEMINI_MODEL = "gemini-1.5-flash";

export type LLM = AILanguageModel | GenerativeModel;

export class LLMManager {
    private llmSession: AILanguageModel | AISummarizer | GenerativeModel | null = null;
    private readonly aiSettings: AISettings;
    private readonly systemPrompt: string;

    constructor(aiSettings: AISettings, systemPrompt: string) {
        this.aiSettings = aiSettings;
        this.systemPrompt = systemPrompt;
    }

    async initialize(): Promise<boolean> {
        if (this.aiSettings.useWebAI) {
            if (!this.aiSettings.geminiApiKey) {
                throw Error("Please set your Gemini API key in the options page");
            }
            this.llmSession = await this.createGeminiSession();
        } else {
            if (!(await this.isLocalAiAvailable())) {
                throw Error("Local AI is not available, enable WebAI in the options page instead");
            }
            this.llmSession = await window.ai.languageModel.create({ systemPrompt: this.systemPrompt });
        }
        return true;
    }

    async prompt(prompt: string): Promise<string> {
        if (!this.llmSession) {
            throw new Error("LLM session not initialized");
        }

        if (this.llmSession instanceof GenerativeModel) {
            return this.promptGemini(prompt);
        }
        return this.promptLocalAI(prompt);
    }

    private async promptGemini(prompt: string): Promise<string> {
        const llmSession = this.llmSession as GenerativeModel;
        const tokenCount = await llmSession.countTokens(prompt);
        console.log("Gemini Token count: ", tokenCount);
        return (await llmSession.generateContent(prompt)).response.text();
    }

    private async promptLocalAI(prompt: string): Promise<string> {
        const llmSession = this.llmSession as AILanguageModel;
        const promptTokens = await llmSession.countPromptTokens(prompt);
        if (promptTokens > MAX_LOCAL_LLM_PROMPT_TOKENS) {
            console.error("Prompt too long");
            return prompt;
        }

        try {
            return await llmSession.prompt(prompt);
        } catch (error) {
            throw new Error("Local AI error: " + error);
        } finally {
            llmSession.destroy();
        }
    }

    private async createGeminiSession(): Promise<GenerativeModel> {
        const genAI = new GoogleGenerativeAI(this.aiSettings.geminiApiKey);
        return await genAI.getGenerativeModel({
            model: GEMINI_MODEL,
            systemInstruction: this.systemPrompt
        });
    }

    private async isLocalAiAvailable(): Promise<boolean> {
        if (!window.ai || !window.ai.languageModel) {
            console.warn("AI is not supported in this browser");
            return false;
        }

        const aiCapabilities = await window.ai.languageModel.capabilities();

        switch (aiCapabilities.available) {
            case "no":
                console.warn("AI language model is not available");
                return false;
            case "after-download":
                console.warn("AI available after download")
                return false;
            case "readily":
                return true;
            default:
                console.warn("Unknown AI availability status");
                return false;
        }
    }
}
