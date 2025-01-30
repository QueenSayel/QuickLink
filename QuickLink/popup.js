document.addEventListener('DOMContentLoaded', function () {
    const addNoteButton = document.getElementById('addNoteButton');
    const findNoteButton = document.getElementById('findNoteButton');
    const settingsButton = document.getElementById('settingsButton');
    const status = document.getElementById('status');
    const noteText = document.getElementById('noteText');
    const noteKeyword = document.getElementById('noteKeyword');
    const addUrlButton = document.getElementById('addUrlButton');
    const urlFieldsContainer = document.getElementById('urlFieldsContainer');
    let urlFieldIndex = 0;

    // Set focus to noteKeyword on load
    noteKeyword.focus();

    // Get current tab's URL on popup open
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs && tabs[0] && tabs[0].url) {
            noteText.value = tabs[0].url;
        }
    });

    addNoteButton.addEventListener('click', function () {
        addNote();
    });

    findNoteButton.addEventListener('click', function () {
        findNote();
    });

    settingsButton.addEventListener('click', function () {
        chrome.tabs.create({ url: chrome.runtime.getURL('list.html') });
    });

    noteKeyword.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent default form submission
           addNote();
        }
    });

    addUrlButton.addEventListener('click', function() {
        addURLField();
    })

    function addURLField() {
       const newUrlField = document.createElement('input');
        newUrlField.type = 'text';
        newUrlField.placeholder = 'Enter another URL';
        newUrlField.className = 'dynamicUrlField';
        newUrlField.id = `urlField-${urlFieldIndex}`;
         const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        removeButton.className = 'removeButton';
        removeButton.onclick = function() {
            removeURLField(newUrlField.id);
        };
        const urlDiv = document.createElement('div');
        urlDiv.appendChild(newUrlField);
        urlDiv.appendChild(removeButton);

        urlFieldsContainer.appendChild(urlDiv);
        urlFieldIndex++;

    }

     function removeURLField(fieldId) {
        const fieldToRemove = document.getElementById(fieldId);
        if(fieldToRemove) {
            fieldToRemove.parentNode.remove();
        }
    }
    
     async function loadData() {
        return new Promise((resolve) => {
            chrome.storage.sync.get('urls', (result) => {
                const urls = result.urls || [];
                resolve(urls);
            });
        });
    }
     async function saveData(urls) {
         return new Promise((resolve) => {
            chrome.storage.sync.set({ urls: urls }, () => {
                resolve();
             });
         });
    }
    function generateData(){
        return [];
    }

    function ensureProtocol(url) {
         if(url && !url.startsWith('http://') && !url.startsWith('https://')) {
                return 'http://' + url;
          }
        return url;
    }
    
     async function addNote() {
        const noteKeywordValue = noteKeyword.value;
         const noteTextValue = ensureProtocol(noteText.value);
        const isUrl = true; // Always a URL, hence true
         const dynamicUrlFields = document.querySelectorAll('.dynamicUrlField');
        const urls = [noteTextValue, ...Array.from(dynamicUrlFields).map(field => ensureProtocol(field.value))];
		
		if (!noteKeywordValue || urls.every(url => !url)) {
            status.textContent = 'Both fields required';
            setTimeout(() => {
                status.textContent = '';
            }, 2000);
            return;
        }
         if (urls.some(url => url && !isValidUrl(url))) {
            status.textContent = 'Invalid URL';
            setTimeout(() => {
                status.textContent = '';
            }, 2000);
            return;
        }

        try {
            let existingUrls = await loadData();
             const existingNote = existingUrls.find(url => url.keyword === noteKeywordValue);
            if (existingNote) {
                 status.textContent = 'Keyword taken';
                 setTimeout(() => {
                    status.textContent = '';
                }, 2000);
               return;
            } else {
                 const newNote = {
                    keyword: noteKeywordValue,
                    text: urls.filter(url => url), // Filter out empty urls from the array, so we don't store empty strings
                    isUrl: isUrl,
                    timestamp: new Date().toISOString(),
                };
                existingUrls.push(newNote);

				await saveData(existingUrls);
                status.textContent = 'URL added';
                noteKeyword.value = '';
                urlFieldsContainer.innerHTML = '';
                 setTimeout(() => {
                    status.textContent = '';
                }, 200);
                window.close();
            }
        } catch (error) {
            status.textContent = 'Error adding url';
             setTimeout(() => {
                    status.textContent = '';
                }, 2000);
            console.error('Error adding url: ', error);
        }
    }

    async function findNote() {
        const noteKeywordValue = noteKeyword.value;
		try {
            const urls = await loadData();
             const note = urls.find(url => url.keyword === noteKeywordValue);

            if (note) {
                 if (note.isUrl) {
                     let urlsToOpen = Array.isArray(note.text) ? note.text : [note.text];
                     urlsToOpen.forEach(url => {
                         const urlWithProtocol = ensureProtocol(url)
                         chrome.tabs.create({ url: urlWithProtocol }, function (tab) {
                           console.log('Opened tab with URL: ', urlWithProtocol);
                           });
                     })
                     status.textContent = 'Opening URLs...';
                  }
             } else {
               status.textContent = 'URL not found';
            }
            setTimeout(() => {
                status.textContent = '';
            }, 2000);
		} catch (error) {
             status.textContent = 'Error finding url';
              setTimeout(() => {
                    status.textContent = '';
                }, 2000);
            console.error('Error finding url: ', error);
        }
    }
    
    function isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }
});