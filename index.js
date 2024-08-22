const header_fuseoptions = {
    minMatchCharLength: 5,
    threshold: 0.0,
    distance: 0,
    keys: ['Header']
};

const framework_fuseoptions = {
    minMatchCharLength: 3,
    threshold: 0.0,
    distance: 0,
    keys: ['filename']
};

const URL_PREFIX = 'https://raw.githubusercontent.com/donato-fiore/iOS-Runtime-Headers/main';

const fuseIndex = {
    16.5: {
        'Headers': new Fuse(iOS16_5_header_index, header_fuseoptions),
        'Frameworks': new Fuse(iOS16_5_framework_index, framework_fuseoptions)
    },
    16: {
        'Headers': new Fuse(iOS16_0_header_index, header_fuseoptions),
        'Frameworks': new Fuse(iOS16_0_framework_index, framework_fuseoptions)
    },
    15.6: {
        'Headers': new Fuse(iOS15_6_header_index, header_fuseoptions),
        'Frameworks': new Fuse(iOS15_6_framework_index, framework_fuseoptions)
    },
    15: {
        'Headers': new Fuse(iOS15_0_header_index, header_fuseoptions),
        'Frameworks': new Fuse(iOS15_0_framework_index, framework_fuseoptions)
    },
}

// Pragma mark: - Variables

const searchResultsList = document.getElementById('searchResults');
var version = -1;
var fuse;
var currentURL = "";
var searchMode = "header";

// Pragma mark: - Utils

function getHeadersForFramework(framework) {
    const headers = [];
    const _fuse = fuseIndex[version]['Headers'];

    for (const header of _fuse.getIndex().docs) {
        if (header.Path.includes(`${framework}.framework`)) {
            headers.push(header);
        }
    }

    headers.sort((a, b) => a.Header.localeCompare(b.Header));

    return headers;
}

function clearResults() {
    document.getElementById('searchResults').innerHTML = '';
}

function clearHeader() {
    document.getElementById('frameworkResults').innerHTML = '';
}

function performSearch(query) {
    const searchResults = fuse.search(query);

    console.log(searchResults);

    clearResults();
    if (searchMode == 'header') {
        searchResults.forEach(result => {
            const li = document.createElement('li');
            var element = document.createElement('a');

            element.href = `${URL_PREFIX}/${result.item.Path}`;
            element.target = '_blank';
            element.textContent = `${result.item.Header}`;

            element.addEventListener("click", loadHeaderFromURL);

            li.appendChild(element);
            searchResultsList.appendChild(li);
        });
    } else {
        searchResults.forEach(result => {
            const li = document.createElement('li');
            var element = document.createElement('a');

            element.href = `${URL_PREFIX}/${result.item.Path}/${result.item.filename}`;
            element.target = '_blank';
            element.textContent = `${result.item.filename}`;

            element.addEventListener("click", loadFrameworkFrom);

            li.appendChild(element);
            searchResultsList.appendChild(li);
        });
    }
}

function loadFrameworkFrom(e) {
    try {
        e.preventDefault();
    } catch (error) { /* */ }

    var headerContainer = document.getElementById('header-container');
    headerContainer.style.display = 'none';

    var listContainer = document.getElementById('framework-list-container');
    listContainer.style.display = 'block';

    var framework = e.target.href.split('/').reverse()[0];
    console.log('Fetching Framework:', framework);

    var headers = getHeadersForFramework(framework);
    console.log('Headers:', headers);

    var frameworkResultsList = document.getElementById('frameworkResults');
    clearHeader();

    headers.forEach(header => {
        const li = document.createElement('li');
        var element = document.createElement('a');

        element.href = `${URL_PREFIX}/${header.Path}`;
        element.target = '_blank';
        element.textContent = `${header.Header}`;

        element.addEventListener("click", loadHeaderFromURL);

        li.appendChild(element);
        frameworkResultsList.appendChild(li);
    });

    // download button
    var downloadCell = document.getElementById('download-cell');

    var downloadButton = document.createElement('button');
    downloadButton.className = 'download-button';
    downloadButton.style.width = '100%';

    downloadButton.innerHTML = `${framework}.framework/${framework}`;
    downloadButton.addEventListener('click', function () {
        // download from ${e.target.href}
        window.open(e.target.href);
    });

    downloadCell.innerHTML = '';
    downloadCell.appendChild(downloadButton);
}

function loadHeaderFromURL(e) {
    try {
        e.preventDefault();
    } catch (error) { /* */ }

    const url = e.target.href;
    console.log('Fetching URL:', url);
    fetch(url).then(r => {
        if (!r.ok)
            throw new Error(`HTTP error! status: ${r.status}`);

        return r.text();
    }).then(t => {
        var headerContainer = document.getElementById('header-container');
        headerContainer.style.display = 'block';

        var listContainer = document.getElementById('framework-list-container');
        listContainer.style.display = 'none';

        headerContainer.removeAttribute('data-highlighted');
        headerContainer.classList.remove('hljs');

        headerContainer.innerHTML = t;
        hljs.highlightAll();

        currentURL = url;
    }).catch(error => {
        console.error('Fetch error:', error);
    });
}


// Pragma mark: - Event Listeners

document.getElementById('versionDropdown').addEventListener('change', function (e) {
    const versionStr = e.target.value;
    version = parseFloat(versionStr);

    console.log('Selected version:', version);

    if (searchMode == "header") {
        fuse = fuseIndex[version]['Headers'];
    } else {
        fuse = fuseIndex[version]['Frameworks'];
    }

    var fuseoptions = header_fuseoptions;
    if (searchMode == "framework") {
        fuseoptions = framework_fuseoptions;
    }

    const searchPattern = document.getElementById('search').value;

    if (searchPattern.length < fuseoptions.minMatchCharLength) {
        clearResults();
        return;
    }

    performSearch(searchPattern);

    if (currentURL != "") {
        loadHeaderFromURL({ target: { href: currentURL } });
    }
});

document.getElementById('search').addEventListener('input', function (e) {
    if (version == -1) return;

    const searchPattern = e.target.value;

    var fuseoptions = header_fuseoptions;
    if (searchMode == "framework") {
        fuseoptions = framework_fuseoptions;
    }

    if (searchPattern.length < fuseoptions.minMatchCharLength) {
        clearResults();
        return;
    }

    performSearch(searchPattern);
});


document.querySelectorAll('input[name="segment"]').forEach((input) => {
    input.addEventListener('change', function () {
        clearResults();
        searchMode = document.querySelector('input[name="segment"]:checked').id;
        console.log('Search Mode:', searchMode);
        var search = "Header";
        if (searchMode == "framework") {
            search = "Framework";
        }

        if (searchMode == "header") {
            fuse = fuseIndex[version]['Headers'];
        } else {
            fuse = fuseIndex[version]['Frameworks'];
        }

        document.getElementById('search').placeholder = `${search} Search`;
    });
});
