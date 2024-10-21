let popup = null;

// listeners for showing/removing the pop-up
let mouseupListener;
let documentClickListener;

// only add the mouse up listener when
// no pop-up is on screen. i.e. allow user selection
function addMouseupListener() {
  mouseupListener = function(event) {
    const selectedText = window.getSelection().toString().trim();
    
    if (selectedText.length > 0) {
      showPopup(event.pageX, event.pageY, selectedText);
    } else if (popup) {
      removePopup();
    }
  };

  document.addEventListener('mouseup', mouseupListener);
}

function removeMouseupListener() {
  document.removeEventListener('mouseup', mouseupListener);
}

addMouseupListener();

// add click listener to listen to user 
// clicks to remove pop-up
function addDocumentClickListener() {
  documentClickListener = function(event) {
    if (popup && !popup.contains(event.target)) {
      removePopup();
    }
  };

  document.addEventListener('click', documentClickListener);
}

function removeDocumentClickListener() {
  document.removeEventListener('click', documentClickListener);
}

function showPopup(x, y, text) {
  if (popup) {
    removePopup();
  }

  removeMouseupListener();

  popup = document.createElement('div');
  popup.className = 'highlight-popup';
  popup.innerHTML = `
    <button id="save-highlight">Save as Amphy note</button>
    <span class="click-instruction">Ctrl + Shift + A</span>
  `;

  popup.style.left = `${x}px`;
  popup.style.top = `${y + 20}px`;

  document.body.appendChild(popup);

  const saveHighlightButton = document.getElementById('save-highlight');
  saveHighlightButton.addEventListener('click', function() {
    saveHighlight(text);
    removePopup();
  });

  // Add keyboard shortcut listener
  const keydownListener = function(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
      e.preventDefault();
      saveHighlightButton.click();
    }
  };
  document.addEventListener('keydown', keydownListener);

  // Add a small delay before adding the document click listener
  // to prevent immediate closing of the popup
  setTimeout(() => {
    addDocumentClickListener();
  }, 1);

  // Update removePopup function to remove the keydown listener
  const originalRemovePopup = removePopup;
  removePopup = function() {
    document.removeEventListener('keydown', keydownListener);
    originalRemovePopup();
  };
}

function removePopup() {
  if (popup) {
    popup.remove();
    popup = null;
    addMouseupListener();
    removeDocumentClickListener();
  }
}

function saveHighlight(text) {
  chrome.storage.sync.get(['notes'], function(result) {
    const notes = result.notes || [];
    notes.push(text);
    chrome.storage.sync.set({notes: notes}, function() {
      console.log('Highlight saved');
    });
  });
}

// Load external CSS file
const link = document.createElement('link');
link.rel = 'stylesheet';
link.type = 'text/css';
link.href = chrome.runtime.getURL('styles.css');
document.head.appendChild(link);
