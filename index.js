const fuseoptions = {
    minMatchCharLength: 5,
    threshold: 0.0,
    distance: 0,
    keys: [ 'Header' ]
};

const URL_PREFIX = 'https://raw.githubusercontent.com/donato-fiore/iOS-Runtime-Headers/main';

const fuseIndex = {
    // 17: new Fuse(iOS17_index, fuseoptions),
    16: new Fuse(iOS16_index, fuseoptions),
    15: new Fuse(iOS15_index, fuseoptions),
}

// Pragma mark: - Variables

const searchResultsList = document.getElementById('searchResults');
var version = -1;
var fuse;

// Pragma mark: - Utils

function clearResults() {
    document.getElementById('searchResults').innerHTML = '';
}

function performSearch(query) {
    const searchResults = fuse.search(query);

    console.log(searchResults);

    clearResults();
    searchResults.forEach(result => {
        const li = document.createElement('li');
        var element = document.createElement('a');
        element.href = `${URL_PREFIX}/${version}.0/${result.item.RelativePath}`;
        element.target = '_blank';
        element.textContent = `${result.item.Header}.h`;

        element.addEventListener("click", loadHeaderFromURL);

        li.appendChild(element);
        searchResultsList.appendChild(li);
    });
}

function loadHeaderFromURL(e) {
    e.preventDefault();
    const url = e.target.href;
    console.log('Fetching URL:', url);
    fetch(url).then(r => {
        if (!r.ok) {
            throw new Error(`HTTP error! status: ${r.status}`);
        }
        return r.text();
    }).then(t => {
        var headerContainer = document.getElementById('header-container');
        headerContainer.removeAttribute('data-highlighted');
        headerContainer.classList.remove('hljs');

        headerContainer.innerHTML = t;
        hljs.highlightAll();
    }).catch(error => {
        console.error('Fetch error:', error);
    });
}


// Pragma mark: - Event Listeners

document.getElementById('versionDropdown').addEventListener('change', function(e) {
    const versionStr = e.target.value;
    version = parseInt(versionStr);

    fuse = fuseIndex[version];

    const searchPattern = document.getElementById('search').value;
    if (searchPattern.length < fuseoptions.minMatchCharLength) {
        clearResults();
        return;
    }

    performSearch(searchPattern);
});

document.getElementById('search').addEventListener('input', function(e) {
    if (version == -1) return;
    
    const searchPattern = e.target.value;
    if (searchPattern.length < fuseoptions.minMatchCharLength) {
        clearResults();
        return;
    }

    performSearch(searchPattern);
});