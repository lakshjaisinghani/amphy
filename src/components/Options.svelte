<script lang="ts">
    import { chromeStorageSync } from "../lib/storage";
    import type { AISettings } from "../lib/types";

    const aiSettingsStore = chromeStorageSync<AISettings>("aiSettings");
    
    let apiKey = "";
    let apiKeyInputValue = "";
    let useWebAI = false;

    aiSettingsStore.subscribe((value) => {
        const settings = value || { useWebAI: true, geminiApiKey: "" };
        useWebAI = settings.useWebAI;
        apiKey = settings.geminiApiKey;
    });

    function saveApiKey() {
        console.log("Saving API key", apiKeyInputValue);
        aiSettingsStore.update(settings => ({
            ...settings,
            geminiApiKey: apiKeyInputValue
        }));
    }

    function clearApiKey() {
        aiSettingsStore.update(settings => ({
            ...settings,
            geminiApiKey: ""
        }));
        apiKeyInputValue = "";
    }

    function toggleWebAI() {
        aiSettingsStore.update(settings => ({
            ...settings,
            useWebAI: useWebAI
        }));
    }
</script>

<main>
    <h1>Settings</h1>

    <div class="option-group">
        <h2>Web AI Model Configuration</h2>

        <div class="toggle-group">
            <label class="toggle-label">
                <span>Use Web AI Model</span>
                <div class="toggle-switch">
                    <input
                        type="checkbox"
                        bind:checked={useWebAI}
                        on:change={toggleWebAI}
                    />
                    <span class="slider"></span>
                </div>
            </label>
            <p class="help-text">
                {#if useWebAI}
                    Using Gemini Web AI model (requires API key)
                {:else}
                    Using local AI model (no API key required)
                {/if}
            </p>
        </div>

        {#if useWebAI}
            <div class="input-group">
                <label for="apiKey">Gemini API Key</label>
                {#if apiKey}
                    <input
                        type="password"
                        id="apiKey"
                        value={apiKey}
                        disabled
                    />
                    <button on:click={clearApiKey}>Clear</button>
                {:else}
                    <input
                        type="password"
                        id="apiKey"
                        bind:value={apiKeyInputValue}
                        placeholder="Enter your Gemini API key"
                    />
                    <button on:click={saveApiKey} disabled={!apiKeyInputValue}
                        >Save</button
                    >
                {/if}
                <p class="help-text">
                    {#if apiKey}
                        Your API key is saved. You can clear it using the button
                        above.
                    {:else}
                        Get your API key from <a
                            href="https://aistudio.google.com/app/apikey"
                            target="_blank"
                            rel="noopener">Google AI Studio</a
                        >
                    {/if}
                </p>
            </div>
        {/if}
    </div>
</main>

<style>
    main {
        padding: 20px;
        max-width: 600px;
        margin: 0 auto;
    }

    h1 {
        color: #2c3e50;
        margin-bottom: 30px;
    }

    .option-group {
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    h2 {
        color: #34495e;
        font-size: 1.2em;
        margin-bottom: 15px;
    }

    .input-group {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 10px;
    }

    label {
        font-weight: bold;
        color: #2c3e50;
    }

    input {
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 1em;
    }

    button {
        background-color: #3498db;
        color: white;
        border: none;
        padding: 10px 15px;
        border-radius: 5px;
        cursor: pointer;
        align-self: flex-start;
    }

    button:hover {
        background-color: #2980b9;
    }

    button:disabled {
        background-color: #bdc3c7;
        cursor: not-allowed;
    }

    .help-text {
        font-size: 0.9em;
        color: #7f8c8d;
        margin-top: 10px;
    }

    a {
        color: #3498db;
        text-decoration: none;
    }

    a:hover {
        text-decoration: underline;
    }

    .toggle-group {
        margin-bottom: 20px;
        padding-bottom: 20px;
        border-bottom: 1px solid #eee;
    }

    .toggle-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
    }

    .toggle-switch {
        position: relative;
        display: inline-block;
        width: 60px;
        height: 34px;
    }

    .toggle-switch input {
        opacity: 0;
        width: 0;
        height: 0;
    }

    .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #ccc;
        transition: 0.4s;
        border-radius: 34px;
    }

    .slider:before {
        position: absolute;
        content: "";
        height: 26px;
        width: 26px;
        left: 4px;
        bottom: 4px;
        background-color: white;
        transition: 0.4s;
        border-radius: 50%;
    }

    input:checked + .slider {
        background-color: #3498db;
    }

    input:checked + .slider:before {
        transform: translateX(26px);
    }
</style>
