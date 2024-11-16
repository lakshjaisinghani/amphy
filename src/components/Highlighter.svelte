<script lang="ts">
    import { chromeStorageSync } from "../lib/storage";
    import type { NoteGroup } from "../lib/types";

    const notesStore = chromeStorageSync<NoteGroup[]>("notes");
    const activeTabStore = chromeStorageSync<string>("activeTab");

    let noteGroups: NoteGroup[] = $state([]);
    let activeTab = $state("General");
    let popup: HTMLElement | null = $state(null);
    let selectedText = $state("");
    let popupX = $state(0);
    let popupY = $state(0);
    let isExpanded = $state(false);

    notesStore.subscribe((value) => {
        noteGroups = value || [{ tab: "General", notes: [] }];
    });

    activeTabStore.subscribe((value) => {
        activeTab = value || "General";
    });

    function handleDocumentClick(event: MouseEvent) {
        selectedText = window.getSelection()?.toString().trim() || "";

        if (popup && !popup.contains(event.target as Node)) {
            selectedText = "";
            isExpanded = false;
        }

        if (selectedText.length > 0 && !popup) {
            popupX = event.pageX;
            popupY = event.pageY + 10;
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

<svelte:window onclick={handleDocumentClick} onkeypress={handleKeyPress} />

{#if selectedText}
    <div
        bind:this={popup}
        class="highlight-popup {isExpanded ? 'expanded' : ''}"
        style="left: {popupX}px; top: {popupY}px;"
        role="button"
        tabindex="0"
        onmouseenter={() => (isExpanded = true)}
        onmouseleave={() => (isExpanded = false)}
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
                isExpanded = !isExpanded;
                e.preventDefault();
                e.stopPropagation();
            }
        }}
    >
        <div class="pill-icon">💊</div>
        {#if isExpanded}
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
            <button onclick={saveHighlightClick}>Save as Amphy note</button>
            <span class="click-instruction">Ctrl + Shift + A</span>
        {/if}
    </div>
{/if}

<style>
    .highlight-popup {
        position: absolute;
        background-color: rgba(255, 255, 255, 0.95);
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        padding: 8px;
        z-index: 1000;
        font-family: Arial, sans-serif;
        transition: all 0.3s ease;
    }

    .highlight-popup.expanded {
        display: flex;
        align-items: center;
    }

    .pill-icon {
        font-size: 14px;
    }

    .highlight-popup button {
        background-color: transparent;
        color: #4caf50;
        border: none;
        text-align: center;
        text-decoration: none;
        display: inline-block;
        font-size: 12px;
        font-weight: bold;
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
        margin-left: 2px;
        margin-right: 2px;
    }

    select {
        margin-right: 4px;
        border-radius: 6px;
        border: 1px solid #ddddddc4;
        font-size: 12px;
        background-color: white;
        color: black;
    }
</style>
