const MAX_PROMPT_TOKENS = 1024

export async function Prompt(llmSession: AILanguageModel, prompt: string): Promise<string> {
    const promptTokens = await llmSession.countPromptTokens(prompt)
    if (promptTokens > MAX_PROMPT_TOKENS) {
        console.error("Prompt too long");
        return prompt;
    }

    return await llmSession.prompt(prompt);
}

export async function CreateLLMSession(
    systemPrompt: string
) {
    if (!(await isLocalAiAvailable())) {
        console.log("TODO: use online LLM service");
        return null;
    }

    const llmSession = await window.ai.languageModel.create({
        systemPrompt: systemPrompt
    });

    return llmSession;
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
