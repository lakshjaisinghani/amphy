import { GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';
import type { AISettings } from './types';

const MAX_LOCAL_LLM_PROMPT_TOKENS = 1024;
const GEMINI_MODEL = "gemini-1.5-flash";

export type LLM = AILanguageModel | GenerativeModel;

export async function Prompt(llmSession: LLM, prompt: string): Promise<string> {
    if (llmSession instanceof GenerativeModel) { // Web AI: Gemini
        return PromptGemini(llmSession, prompt);
    }

    // Local AI
    return PromptLocalAI(llmSession, prompt);

}

async function PromptGemini(llmSession: GenerativeModel, prompt: string): Promise<string> {
    const tokenCount = await llmSession.countTokens(prompt);
    console.log("Gemini Token count: ", tokenCount);
    return (await llmSession.generateContent(prompt)).response.text();
}

async function PromptLocalAI(llmSession: AILanguageModel, prompt: string): Promise<string> {
    const promptTokens = await llmSession.countPromptTokens(prompt);
    if (promptTokens > MAX_LOCAL_LLM_PROMPT_TOKENS) {
        console.error("Prompt too long");
        return prompt;
    }

    try {
        const response = await llmSession.prompt(prompt);
        return response;
    } catch (error) {
        throw new Error("Local AI error: " + error);
    } finally {
        llmSession.destroy();
    }
}

export async function CreateLLMSession(
    systemPrompt: string,
    aiSettings: AISettings
) {
    if (aiSettings.useWebAI) {
        if (!aiSettings.geminiApiKey) {
            alert("Please set your Gemini API key in the options page");
            return null;
        }
        return createGeminiSession(aiSettings.geminiApiKey, systemPrompt);
    }

    if (!(await isLocalAiAvailable())) {
        console.warn("Local AI is not available, enable WebAI in the options page instead");
        return null;
    }

    const llmSession = await window.ai.languageModel.create({
        systemPrompt: systemPrompt
    });

    return llmSession;
}

async function createGeminiSession(apiKey: string, systemPrompt: string): Promise<GenerativeModel> {
    const genAI = new GoogleGenerativeAI(apiKey);
    return await genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        systemInstruction: systemPrompt
    });
}

async function isLocalAiAvailable(): Promise<boolean> {
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
