<script lang="ts">
  import autosize from "svelte-autosize";
  import { marked } from "marked";
  import { chromeStorageSync } from "../lib/storage";
  import { LLMManager } from "../lib/llm";
  import TabBar from "./TabBar.svelte";
  import type { AISettings, NoteGroup } from "../lib/types";

  const notesStore = chromeStorageSync<NoteGroup[]>("notes");
  const activeTabStore = chromeStorageSync<string>("activeTab");
  const aiSettingsStore = chromeStorageSync<AISettings>("aiSettings");

  let noteGroups: NoteGroup[] = $state([]);
  let activeTab = $state("General");
  let userQuestion: string = $state("");
  let answerToUserQuestion: string = $state("");
  let isGeneratingAnswerToUserQuestion = $state(false);
  let quiz: { question: string; answer: string }[] = $state([]);
  let isGeneratingQuiz = $state(false);
  let visibleQuizAnswers: boolean[] = $state([]);
  let isGeneratingSummary = $state(false);

  let activeNoteGroup = $derived($notesStore?.find((g) => g.tab === activeTab))

  let aiSettings: AISettings = { useWebAI: true, geminiApiKey: "" };
  let llmManager: LLMManager | null = null;

  notesStore.subscribe((value) => {
    noteGroups = value || [{ tab: "General", notes: [] }];
  });

  activeTabStore.subscribe((value) => {
    activeTab = value || "General";
  });

  aiSettingsStore.subscribe((value) => {
    aiSettings = value || { useWebAI: true, geminiApiKey: "" };
  });

  function isNoteGroupEmpty(tab: string) {
    return noteGroups.find((g) => g.tab === tab)?.notes.length === 0;
  }

  function updateNote(noteIndex: number, value: string) {
    notesStore.update((groups) => {
      const activeGroup = groups.find((g) => g.tab === activeTab);
      if (activeGroup) {
        activeGroup.notes[noteIndex] = value;
      } else {
        groups.push({ tab: activeTab, notes: [value] });
      }
      return groups;
    });
    scheduleAutoSummarize();
  }

  function createNote(value: string) {
    notesStore.update((groups) => {
      const activeGroup = groups.find((g) => g.tab === activeTab);
      if (activeGroup) {
        activeGroup.notes.push(value);
      } else {
        groups.push({ tab: activeTab, notes: [value] });
      }
      return groups;
    });
    scheduleAutoSummarize();
  }

  function deleteNote(index: number) {
    notesStore.update((groups) => {
const activeGroup = groups.find((g) => g.tab === activeTab);
      if (activeGroup && activeGroup.notes.length > index) {
        activeGroup.notes.splice(index, 1);
      }
      return groups;
    });
  }

  async function askQuestion(prompt: string) {
    const activeNotes = activeNoteGroup?.notes || [];
    const systemPrompt = 
      "You answer questions based on notes given below. \
      Do not add extra info not found in notes. \
      NOTES: \
    " + "\n" + activeNotes.join("\n");

    answerToUserQuestion = "";
    isGeneratingAnswerToUserQuestion = true;

    try {
      llmManager = new LLMManager(aiSettings, systemPrompt);
      if (!await llmManager.initialize()) {
        throw new Error("Failed to initialize LLM");
      }
      answerToUserQuestion = await llmManager.prompt(prompt);
    } catch (error) {
      console.error("Error answering question:", error);
      alert("Error answering question. Please try again");
    } finally {
      isGeneratingAnswerToUserQuestion = false;
    }
  }

  async function generateQuiz() {
    // Local LLM has error of unsupported language when trying to output JSON with curly braces.
    // So we just use a makeshift output format. The labels "questions" and "answers" are important
    // for the dumb LLM to not get confused.
    const systemPrompt =
      'You are a function that generate quiz questions \
      and answers based on notes. \
      Do not use codeblock. \
      Example: \
      questions:["q1", "q2", \
      "q3"...], answers:["a1", "a2",\
       "a3"...] \
    ';

    isGeneratingQuiz = true;

    try {
      llmManager = new LLMManager(aiSettings, systemPrompt);
      if (!await llmManager.initialize()) {
        throw new Error("Failed to initialize LLM");
      }

      const activeNotes = activeNoteGroup?.notes || [];
      const prompt = activeNotes.join("\n");
      const response = await llmManager.prompt(prompt);
      
      const rawQuiz = response.split("answers:");
      
      // Make sure they can be parsed as JSON arrays by starting and ending with square brackets
      rawQuiz[0] = "[" + rawQuiz[0].split("[")[1].split("]")[0] + "]";
      rawQuiz[1] = "[" + rawQuiz[1].split("[")[1].split("]")[0] + "]";
      
      // Remove trailing ellipsis if any - this might be a remnant of the system prompt
      rawQuiz[0] = rawQuiz[0].replace(new RegExp("/\.\.\.$"), ""); 
      rawQuiz[1] = rawQuiz[1].replace(new RegExp("/\.\.\.$"), "");
      
      const questions = JSON.parse(rawQuiz[0]) as string[];
      const answers = JSON.parse(rawQuiz[1]) as string[];
      
      quiz = questions.map((question, index) => ({
        question,
        answer: answers[index],
      }));
      visibleQuizAnswers = new Array(quiz.length).fill(false);
    } catch (error) {
      console.error("Error generating quiz:", error);
      quiz = [
        { question: "Error generating quiz -> " + error, answer: "Please try again" },
      ];
    } finally {
      isGeneratingQuiz = false;
    }
  }

  function toggleAnswer(index: number) {
    visibleQuizAnswers[index] = !visibleQuizAnswers[index];
    visibleQuizAnswers = [...visibleQuizAnswers];
  }

  async function handleAskQuestion() {
    if (userQuestion.trim()) {
      await askQuestion(userQuestion);
    }
  }

  async function exportAllToClipboard() {
    // # General

    // ## Notes
    // 1. First note
    // 2. Second note

    // ## Question & Answer
    // Q: What was the question?
    // A: Here is the answer...

    // ## Quiz
    // 1. Q: First quiz question
    //    A: First answer
    // 2. Q: Second quiz question
    //    A: Second answer
    const activeNotes = activeNoteGroup?.notes || [];
    let clipboardContent = `# ${activeTab}\n\n`; // Start with tab name as title

    // Add notes section if there are notes
    if (activeNotes.length > 0) {
      clipboardContent += "## Notes\n";
      activeNotes.forEach((note, index) => {
        clipboardContent += `${index + 1}. ${note}\n`;
      });
      clipboardContent += "\n";
    }

    // Add Q&A section if there's a question and answer
    if (userQuestion && answerToUserQuestion) {
      clipboardContent += "## Question & Answer\n";
      clipboardContent += `Q: ${userQuestion}\n`;
      clipboardContent += `A: ${answerToUserQuestion}\n\n`;
    }

    // Add quiz section if there are quiz questions
    if (quiz.length > 0) {
      clipboardContent += "## Quiz\n";
      quiz.forEach((q, index) => {
        clipboardContent += `${index + 1}. Q: ${q.question}\n`;
        clipboardContent += `   A: ${q.answer}\n`;
      });
    }

    try {
      await navigator.clipboard.writeText(clipboardContent);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  }

  async function summarizeNotes() {
    const activeNotes = activeNoteGroup?.notes || [];
    if (activeNotes.length === 0) return;
    
    const text = activeNotes.join("\n");
    
    isGeneratingSummary = true;
    try {
        const systemPrompt = "You are a helpful assistant that provides concise summaries.";
        llmManager = new LLMManager(aiSettings, systemPrompt);
        if (!await llmManager.initialize()) {
            throw new Error("Failed to initialize LLM");
        }
        
        const summary = await llmManager.summarize(text);
        
        // Find existing summary note
        notesStore.update((groups) => {
            const activeGroup = groups.find((g) => g.tab === activeTab);
            if (activeGroup) {
                const summaryIndex = activeGroup.notes.findIndex(note => note.startsWith('📝 Summary:'));
                if (summaryIndex !== -1) {
                    // Replace existing summary
                    activeGroup.notes[summaryIndex] = `📝 Summary: ${summary}`;
                } else {
                    // Create new summary if none exists
                    activeGroup.notes.push(`📝 Summary: ${summary}`);
                }
            }
            isGeneratingSummary = false;
            return groups;
        });
    } catch (error) {
        console.error("Error summarizing notes:", error);
        isGeneratingSummary = false;
    }
  }

  function scheduleAutoSummarize(timeoutMs:number = 1000) {
    if (!aiSettings.useWebAI) { // Only auto-summarize for local AI
       setTimeout(summarizeNotes, timeoutMs);
    }
  }
</script>

<main class="popup-container">
  <div class="header">
    <TabBar {noteGroups} {activeTab} />
    <button 
      class="options-button" 
      onclick={() => chrome.runtime.openOptionsPage()}
    >
      ⚙️
    </button>
  </div>
  <div id="notes" class="section">
    {#if !isNoteGroupEmpty(activeTab)}
      {#each noteGroups.find((g) => g.tab === activeTab)?.notes || [] as note, index}
        <div class="note-item">
          <textarea
            use:autosize
            onchange={(e:Event) => {
              const target = e.target as HTMLTextAreaElement;
              updateNote(index, target.value)}}
            class="note-text">{note}</textarea>

          <button class="delete-button" onclick={() => deleteNote(index)}>
            ×
          </button>
        </div>
      {/each}
    {:else}
      <p id="no-notes">No notes in this tab yet</p>
    {/if}
    <div class="note-item">
      <textarea
        use:autosize
        onchange={(e:Event) => {
          const target = e.target as HTMLTextAreaElement;
          createNote(target.value);
          target.value = ""; // Clear the textarea for the next new note
        }}
        class="note-text"
        placeholder="Add a new note"
      ></textarea>
    </div>
  </div>

  {#if !isNoteGroupEmpty(activeTab)}
  <div class="section">
    <div id="ask-question-section">
      <input
        class="user-question-input"
        type="text"
        bind:value={userQuestion}
        onkeypress={(e) => e.key === "Enter" && handleAskQuestion()}
        placeholder="Ask a question about your notes"
      />
      <button class="send-arrow" aria-label="Send message">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
        </svg>
      </button>
    </div>

    {#if answerToUserQuestion}
      <div id="answer">
        {@html marked(answerToUserQuestion)}
      </div>
    {/if}
  </div>
  
  <div class="bottom-actions">
    <button
      class="action-button"
      onclick={generateQuiz}
        disabled={isGeneratingQuiz || activeNoteGroup?.notes.length === 0}
    >
      {isGeneratingQuiz ? "Generating Quiz..." : "Generate Quiz"}
    </button>
    <button
    class="action-button"
      onclick={summarizeNotes}
      disabled={activeNoteGroup?.notes.length === 0 || isGeneratingSummary}
    >
      {isGeneratingSummary ? "Summarizing..." : "Summarize"}
    </button>
      <button class="action-button" onclick={exportAllToClipboard}
        >Copy all</button
      >
  </div>

<div id="quiz-section" class="section">
  {#if quiz.length > 0}
    <div id="quiz">
      <h2>Quiz</h2>
      <ol>
        {#each quiz as q, index}
          <li>
            <button onclick={() => toggleAnswer(index)}>{q.question}</button>
            {#if visibleQuizAnswers[index]}
              <p class="answer">{q.answer}</p>
            {/if}
          </li>
        {/each}
      </ol>
    </div>
  {/if}
  </div>
  {/if}
</main>

<style>
  .popup-container {
    min-width: 300px;
    max-width: 400px;
    padding: 8px;
    background: #fff;
  }

  main {
    padding: 16px;
    max-width: 400px;
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }

  .note-item {
    position: relative;
    background-color: #fff9e6;
    border-radius: 12px;
    padding: 12px;
    margin-bottom: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .note-text {
    width: 100%;
    padding-right: 20px;
    background: transparent;
    border-radius: 8px;
    font-size: 14px;
    line-height: 1.5;
  }

  #ask-question-section {
    margin-top: 16px;
    background: #f5f5f5;
    border-radius: 24px;
    padding: 8px 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .user-question-input {
    background: transparent;
    font-size: 14px;
  }

  button {
    background-color: #ff9966; /* Coral color from the image */
    border-radius: 20px;
    font-size: 14px;
    padding: 8px 16px;
  }

  button:hover {
    background-color: #ff8652;
  }

  .answer {
    background-color: #f5f5f5;
    border-left: none;
    border-radius: 12px;
    padding: 12px;
  }

  #quiz button {
    background-color: #f5f5f5;
    border: none;
    border-radius: 12px;
  }

  .options-button {
    font-size: 16px;
    color: #666;
  }

  .note-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    background-color: #ffffff;
    padding: 10px;
    border-radius: 5px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  .note-text {
    flex-grow: 1;
    margin-right: 10px;
    padding: 8px;
    border: none;
    resize: none;
    min-height: 40px;
    font-family: inherit;
    overflow: hidden;
  }
  .note-text:focus {
    outline: none;
    border: solid;
    border-color: #3498db;
  }
  .delete-button {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 20px;
    height: 20px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    background-color: transparent;
    color: #666;
    opacity: 0.6;
    border-radius: 50%;
  }
  .delete-button:hover {
    opacity: 1;
    background-color: rgba(0, 0, 0, 0.1);
  }
  .user-question-input {
    flex-grow: 1;
    padding: 8px;
    border: none;
    border-radius: 5px;
    font-family: inherit;
    font-size: 1em;
  }
  .section {
    margin-top: 6px;
  }

  button {
    background-color: #3498db;
    color: white;
    border: none;
    padding: 10px 15px;
    border-radius: 5px;
    cursor: pointer;
    transition: background-color 0.3s;
  }

  button:hover {
    background-color: #2980b9;
  }

  button:disabled {
    background-color: #bdc3c7;
    cursor: not-allowed;
  }

  #quiz-section {
    margin-top: 20px;
  }

  #quiz {
    margin-top: 20px;
  }

  #quiz h2 {
    font-size: 1.2em;
    margin-bottom: 10px;
  }

  #quiz ol {
    padding-left: 20px;
  }

  #quiz li {
    margin-bottom: 15px;
  }

  #quiz button {
    text-align: left;
    width: 100%;
    background-color: #f0f0f0;
    color: #333;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 5px;
    cursor: pointer;
    transition: background-color 0.3s;
  }

  #quiz button:hover {
    background-color: #e0e0e0;
  }

  #ask-question-section {
    margin-top: 20px;
    display: flex;
    flex-direction: row;
    gap: 10px;
    justify-content: space-around;
  }

  .answer {
    margin-top: 10px;
    padding: 10px;
    background-color: #e8f5e9;
    border-radius: 5px;
    border-left: 4px solid #4caf50;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0px;
  }

  .options-button {
    background: none;
    border: none;
    font-size: 1.2em;
    padding: 0px;
    margin-bottom: 15px;
    cursor: pointer;
    transition: transform 0.2s;
  }

  .options-button:hover {
    transform: rotate(45deg);
    background: none;
  }

  .send-arrow {
    width: 24px;
    height: 24px;
    padding: 6px;
    border-radius: 50%;
    background: #ff9966;
    cursor: pointer;
    transition: background-color 0.2s;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .send-arrow:hover {
    background: #ff8652;
  }

  .send-arrow svg {
    width: 16px;
    height: 16px;
    fill: white;
  }

  .bottom-actions {
    display: flex;
    gap: 12px;
    margin-top: 12px;
    padding-top: 8px;
  }

  .action-button {
    background: transparent;
    color: #666;
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 12px;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .action-button:hover {
    background: rgba(0, 0, 0, 0.05);
    color: #333;
  }
</style>
