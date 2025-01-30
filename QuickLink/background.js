chrome.omnibox.onInputChanged.addListener(
    async function(text, suggest) {
        try {
            let urls = await loadData();
            const note = urls.find(url => url.keyword === text);
            if(note) {
                  if (note.isUrl) {
                       let urlsToOpen = Array.isArray(note.text) ? note.text : [note.text];
                       if(urlsToOpen && urlsToOpen.length > 0) {
                           suggest(urlsToOpen.map(url => {
                                const urlWithProtocol =  ensureProtocol(url);
                                return { content: urlWithProtocol, description: `Open: ${urlWithProtocol}` };
                             }));
                        } else {
                            suggest([]);
                        }
                    }
            } else {
               suggest([]);
            }
        } catch(error) {
             console.error('Error retrieving url:', error);
           suggest([]);
        }
    }
);


chrome.omnibox.onInputEntered.addListener(async (text) => {
    console.log('Omnibox input:', text);
        try {
            let urls = await loadData();
            const note = urls.find(url => url.keyword === text);
               if (note) {
                if (note.isUrl) {
                    let urlsToOpen = Array.isArray(note.text) ? note.text : [note.text];
                    urlsToOpen.forEach(url => {
                         const urlWithProtocol = ensureProtocol(url);
                          chrome.tabs.create({ url: urlWithProtocol });
                     });
                   
                } else {
                    chrome.tabs.create({ url: 'chrome://newtab' });
                }
            } else {
                chrome.tabs.create({ url: 'chrome://newtab' });
            }
        } catch(error) {
           console.error('Error retrieving url:', error);
           chrome.tabs.create({ url: 'chrome://newtab' });
        }
});

chrome.commands.onCommand.addListener(function (command) {
  if (command === "open_settings") {
    chrome.tabs.create({ url: chrome.runtime.getURL("list.html") });
  }
});

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.get('omniboxKeyword', (data) => {
        if (!data.omniboxKeyword) {
            chrome.storage.sync.set({ omniboxKeyword: 'url' });
        }
    });
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.omniboxKeyword) {
        chrome.omnibox.setDefaultSuggestion({
            description: `Search URL: ${changes.omniboxKeyword.newValue}`
        });
    }
});

async function loadData() {
    return new Promise((resolve) => {
        chrome.storage.sync.get('urls', (result) => {
            const urls = result.urls || [];
            resolve(urls);
        });
    });
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

 function ensureProtocol(url) {
         if(url && !url.startsWith('http://') && !url.startsWith('https://')) {
                return 'http://' + url;
          }
        return url;
    }