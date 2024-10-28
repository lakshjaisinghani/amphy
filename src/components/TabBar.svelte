<script lang="ts">
    import { chromeStorageSync } from "../lib/storage";

    interface NoteGroup {
        tab: string;
        notes: string[];
    }

    export let noteGroups: NoteGroup[];
    export let activeTab: string;

    const activeTabStore = chromeStorageSync<string>("activeTab");
    const notesStore = chromeStorageSync<NoteGroup[]>("notes");

    let isAddingTab = false;
    let newTabName = "";

    function setActiveTab(tab: string) {
        activeTabStore.set(tab);
    }

    function deleteTab(tabName: string) {
        if (tabName === "General") return; // Prevent deleting General tab

        notesStore.update((groups) => {
            const filteredGroups = groups.filter((g) => g.tab !== tabName);
            if (activeTab === tabName) {
                setActiveTab("General");
            }
            return filteredGroups;
        });
    }

    function handleAddTab() {
        if (!newTabName.trim()) return;

        notesStore.update((groups) => {
            if (!groups.some((g) => g.tab === newTabName)) {
                groups.push({ tab: newTabName, notes: [] });
            }
            setActiveTab(newTabName);
            newTabName = "";
            isAddingTab = false;
            return groups;
        });
    }
</script>

<div class="tabs">
    <div class="tabs-scroll">
        {#each noteGroups as group}
            <div class="tab-wrapper" class:active={activeTab === group.tab}>
                <button
                    class="tab-button"
                    on:click={() => setActiveTab(group.tab)}
                >
                    {group.tab}
                </button>
                {#if group.tab !== "General"}
                    <button
                        class="delete-tab"
                        on:click|stopPropagation={() => deleteTab(group.tab)}
                        title="Delete tab"
                    >
                        ×
                    </button>
                {/if}
            </div>
        {/each}

        {#if isAddingTab}
            <div class="new-tab-input">
                <input
                    type="text"
                    bind:value={newTabName}
                    placeholder="New tab name"
                    on:keypress={(e) => e.key === "Enter" && handleAddTab()}
                />
                <button class="confirm-tab" on:click={handleAddTab}>✓</button>
                <button
                    class="cancel-tab"
                    on:click={() => {
                        isAddingTab = false;
                        newTabName = "";
                    }}>×</button
                >
            </div>
        {:else}
            <button
                class="add-tab-button"
                on:click={() => (isAddingTab = true)}
                title="Add new tab"
            >
                +
            </button>
        {/if}
    </div>
</div>

<style>
    .tabs {
        position: relative;
        margin-bottom: 16px;
        border-bottom: 1px solid #ddd;
    }

    .tabs-scroll {
        display: flex;
        overflow-x: auto;
        gap: 2px;
        padding: 2px;
        scrollbar-width: thin;
        -ms-overflow-style: none;
    }

    .tabs-scroll::-webkit-scrollbar {
        height: 6px;
    }

    .tabs-scroll::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 3px;
    }

    .tabs-scroll::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 3px;
    }

    .tabs-scroll::-webkit-scrollbar-thumb:hover {
        background: #555;
    }

    .tab-wrapper {
        position: relative;
        display: flex;
        align-items: center;
        min-width: fit-content;
        border-radius: 5px;
        border-bottom: transparent;
    }

    .tab-wrapper.active {
        background-color: #88dfd8;
        color: white;
    }

    .tab-wrapper:hover {
        background-color: #33d3c8;
        color: white;
    }

    .tab-button {
        background-color: inherit;
        color: inherit;
        border: none;
        padding: 8px 16px;
        border-radius: 5px;
        cursor: pointer;
        margin: 0;
        white-space: nowrap;
    }

    .delete-tab {
        background: inherit;
        border: none;
        color: inherit;
        padding: 0 4px;
        margin: 0 0 0 8px;
        font-size: 18px;
        cursor: pointer;
        opacity: 0.7;
    }

    .delete-tab:hover {
        opacity: 1;
    }

    .add-tab-button {
        background-color: #f0f0f0;
        color: #333;
        border: none;
        padding: 4px 8px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 18px;
        margin: 0;
        height: 36px;
        width: 36px;
        min-width: 36px;
    }

    .new-tab-input {
        display: flex;
        gap: 4px;
        align-items: center;
    }

    .new-tab-input input {
        padding: 4px 8px;
        border: 1px solid #ddd;
        border-radius: 5px;
        font-size: 14px;
        width: 120px;
    }

    .confirm-tab,
    .cancel-tab {
        background: none;
        border: none;
        padding: 4px 8px;
        margin: 0;
        cursor: pointer;
        font-size: 16px;
    }

    .confirm-tab {
        color: #2ecc71;
    }

    .cancel-tab {
        color: #e74c3c;
    }
</style>
