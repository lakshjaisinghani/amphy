<script lang="ts">
    import { chromeStorageSync } from "../lib/storage";
    import type { NoteGroup } from "../lib/types";
    import { onMount } from "svelte";
    // Update store to use NoteGroup array
    const notesStore = chromeStorageSync<NoteGroup[]>("notes");
    const activeTabStore = chromeStorageSync<string>("activeTab");

    let noteGroups: NoteGroup[] = [];
    let activeTab = "General";
    let popup: HTMLElement | null = null;
    let selectedText = "";
    let popupX = 0;
    let popupY = 0;

    onMount(() => {
        const unsubscribeNotes = notesStore.subscribe((value) => {
            noteGroups = value || [{ tab: "General", notes: [] }];
        });

        const unsubscribeTab = activeTabStore.subscribe((value) => {
            activeTab = value || "General";
        });

        return () => {
            unsubscribeNotes();
            unsubscribeTab();
        };
    });

    function handleDocumentClick(event: MouseEvent) {
        selectedText = window.getSelection()?.toString().trim() || "";

        if (popup && !popup.contains(event.target as Node)) {
            selectedText = "";
        }

        if (selectedText.length > 0 && !popup) {
            popupX = event.pageX;
            popupY = event.pageY + 20;
        }
    }

    function saveHighlightClick(event: MouseEvent) {
        event.stopPropagation(); // Prevent the click from bubbling up to the document
        saveHighlight();
    }

    function saveHighlight() {
        console.log("saveHighlight: ", selectedText);
        notesStore.update((noteGroups) => {
            const groups = noteGroups || [];
            const activeGroup = groups.find((g) => g.tab === activeTab);

            if (activeGroup) {
                activeGroup.notes.push(selectedText);
            } else {
                groups.push({
                    tab: activeTab,
                    notes: [selectedText],
                });
            }

            activeTabStore.set(activeTab);

            selectedText = ""; // clears the popup
            return groups;
        });
    }

    function handleKeyPress(event: KeyboardEvent) {
        if (event.ctrlKey && event.shiftKey && event.key === "A") {
            event.preventDefault();
            saveHighlight();
        }
    }
</script>

<svelte:window on:click={handleDocumentClick} on:keypress={handleKeyPress} />

{#if selectedText}
    <div
        bind:this={popup}
        class="highlight-popup"
        style="left: {popupX}px; top: {popupY}px;"
    >
        <select bind:value={activeTab}>
            {#each noteGroups as group}
                <option value={group.tab}>{group.tab}</option>
            {/each}
            {#if noteGroups.length === 1 && noteGroups[0].tab === "General"}
                <option value="Important">Important</option>
                <option value="Todo">Todo</option>
                <option value="Research">Research</option>
            {/if}
        </select>
        <button on:click={saveHighlightClick}>Save as Amphy note</button>
        <span class="click-instruction">Ctrl + Shift + A</span>
    </div>
{/if}

<style>
    .highlight-popup {
        position: absolute;
        background-color: rgba(255, 255, 255, 0.95);
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        padding: 12px;
        z-index: 1000;
        font-family: Arial, sans-serif;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
    }

    .highlight-popup button {
        background-color: transparent;
        color: #4caf50;
        border: none;
        padding: 8px 16px;
        text-align: center;
        text-decoration: none;
        display: inline-block;
        font-size: 14px;
        font-weight: bold;
        margin: 0;
        cursor: pointer;
        border-radius: 10px;
        transition:
            background-color 0.3s ease,
            color 0.3s ease;
    }

    .highlight-popup button:hover {
        background-color: rgba(76, 175, 80, 0.1);
        color: #45a049;
    }

    .click-instruction {
        color: #999;
        font-size: 12px;
        margin-left: 4px;
        margin-right: 4px;
    }

    select {
        padding: 4px 8px;
        margin-right: 8px;
        border-radius: 6px;
        border: 1px solid #ddddddc4;
        font-size: 14px;
        background-color: white;
        color: black;
    }
</style>
