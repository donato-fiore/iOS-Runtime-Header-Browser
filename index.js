const HEADER_FUSEOPTIONS = {
    minMatchCharLength: 4,
    threshold: 0.0,
    distance: 0,
    keys: ['Header']
};

const FRAMEWORK_FUSEOPTIONS = {
    minMatchCharLength: 1,
    threshold: 0.0,
    distance: 0,
    keys: ['filename']
};

const URL_PREFIX = 'https://raw.githubusercontent.com/donato-fiore/iOS-Runtime-Headers/main';

const searchResultsList = document.getElementById('search-results-list');
let currentVersion = -1;
let searchMode = 'header';
let currentFramework = null;

const fuseIndex = {
    16.5: {},
    16: {},
    15.6: {},
    15: {}
}

// Pragma mark: - Functions
function setViewTitle(title) {
    document.getElementById('title').textContent = title;
}

function clearSearchResults() {
    document.getElementById('search-results-list').innerHTML = '';
}

function clearFrameworkHeaderResults() {
    document.getElementById('framework-results-list').innerHTML = '';
}

function headersForFramework(framework, query) {
    const headers = [];
    const _fuse = fuseIndex[currentVersion]['Headers'];

    if (query.length == 0) {
        for (const header of _fuse.getIndex().docs) {
            if (header.Path.includes(`${framework}.framework`)) {
                headers.push(header);
            }
        }
    } else {
        for (const header of _fuse.getIndex().docs) {
            if (header.Path.includes(`${framework}.framework`) && header.Path.toLowerCase().includes(query.toLowerCase())) {
                headers.push(header);
            }
        }
    }

    headers.sort((a, b) => a.Header.localeCompare(b.Header));

    return headers;
}

// function safe_frameworkHeaderSearch(query) {
// }

function lazyLoadIndexFromVersion() {
    const num = currentVersion.toString();
    const versionStr = Number(num).toFixed(Math.max(num.split('.')[1]?.length, 1) || 1);

    console.info('Lazy loading index for version', versionStr);

    const headerIndex = document.createElement('script');
    headerIndex.src = `iOS${versionStr}_header_index.min.js`;
    document.head.appendChild(headerIndex);

    headerIndex.onload = () => {
        let index;
        if (currentVersion == 15) {
            index = iOS15_0_header_index;
        } else if (currentVersion == 15.6) {
            index = iOS15_6_header_index;
        } else if (currentVersion == 16) {
            index = iOS16_0_header_index;
        } else if (currentVersion == 16.5) {
            index = iOS16_5_header_index;
        }

        fuseIndex[currentVersion]['Headers'] = new Fuse(index, HEADER_FUSEOPTIONS);
    }

    const frameworkIndex = document.createElement('script');
    frameworkIndex.src = `iOS${versionStr}_framework_index.min.js`;
    document.head.appendChild(frameworkIndex);

    frameworkIndex.onload = () => {
        let index;
        if (currentVersion == 15) {
            index = iOS15_0_framework_index;
        } else if (currentVersion == 15.6) {
            index = iOS15_6_framework_index;
        } else if (currentVersion == 16) {
            index = iOS16_0_framework_index;
        } else if (currentVersion == 16.5) {
            index = iOS16_5_framework_index;
        }

        fuseIndex[currentVersion]['Frameworks'] = new Fuse(index, FRAMEWORK_FUSEOPTIONS);
    }
}

function headerSearch(query) {
    const results = fuseIndex[currentVersion]['Headers'].search(query);

    clearSearchResults();
    results.forEach((result) => {
        const li = document.createElement('li');
        const element = document.createElement('a');

        element.href = `${URL_PREFIX}/${result.item.Path}`;
        element.target = '_blank';
        element.textContent = `${result.item.Header}`;

        element.addEventListener('click', loadHeaderFromEvent);

        li.appendChild(element);
        searchResultsList.appendChild(li);
    });
}

function frameworkSearch(query) {
    clearSearchResults();

    let results = [];
    if (query.length == 0) {
        for (const header of fuseIndex[currentVersion]['Frameworks'].getIndex().docs) {
            results.push({ item: header });
        }
    } else {
        results = fuseIndex[currentVersion]['Frameworks'].search(query);
    }

    results.forEach((result) => {
        const li = document.createElement('li');
        const element = document.createElement('a');

        element.href = `${URL_PREFIX}/${result.item.Path}/${result.item.filename}`;
        element.target = '_blank';
        element.textContent = `${result.item.filename}`;

        element.addEventListener('click', loadFrameworkFromEvent);

        li.appendChild(element);
        searchResultsList.appendChild(li);
    });
}

function safe_headerSearch(query) {
    if (typeof fuseIndex[currentVersion]['Headers'] != 'undefined') {
        headerSearch(query);
    } else {
        setTimeout(() => {
            headerSearch(query);
        }, 250);
    }
}

function safe_frameworkSearch(query) {
    if (typeof fuseIndex[currentVersion]['Frameworks'] != 'undefined') {
        frameworkSearch(query);
    } else {
        setTimeout(() => {
            frameworkSearch(query);
        }, 250);
    }
}

function loadHeaderFromEvent(event) {
    try {
        event.preventDefault();
    } catch (error) { /* pass */ }

    const url = event.target.href;
    console.log('Loading header from', url);
    fetch(url).then((resp) => {
        if (!resp.ok) throw new Error(`HTTP error: ${resp.status}`);
        return resp.text();
    }).then(text => {
        const headerContainer = document.getElementById('header-container');
        headerContainer.style.display = 'block';

        const frameworkListContainer = document.getElementById('framework-list-container');
        frameworkListContainer.style.display = 'none';

        headerContainer.removeAttribute('data-highlighted');
        headerContainer.classList.remove('hljs');

        headerContainer.innerHTML = text;
        hljs.highlightAll();

        const framework_path = url.replace(`${URL_PREFIX}/`, '').split('/Headers/')[0];
        const framework_name = framework_path.split('.framework')[0].split('/').reverse()[0];

        // download button
        const downloadCell = document.getElementById('download-container');
        const downloadButton = document.createElement('button');
        downloadButton.className = 'download-button';
        downloadButton.style.width = '100%';

        downloadButton.innerHTML = `${framework_name}.framework/${framework_name}`;
        downloadButton.addEventListener('click', function () {
            window.open(`${URL_PREFIX}/${framework_path}/${framework_name}`);
        });

        downloadCell.innerHTML = '';
        downloadCell.appendChild(downloadButton);

        setViewTitle(`${url.split('/').reverse()[0]}`);
    }).catch((error) => {
        console.error('Error loading header', error);
    })
}

function loadFrameworkFromEvent(event) {
    try {
        event.preventDefault();
    } catch (error) { /* pass */ }

    const frameworkResultsList = document.getElementById('framework-results-list');

    const headerContainer = document.getElementById('header-container');
    headerContainer.style.display = 'none';

    const frameworkListContainer = document.getElementById('framework-list-container');
    frameworkListContainer.style.display = 'block';

    const framework = event.target.href.split('/').reverse()[0];
    console.log('Loading framework', framework);

    clearFrameworkHeaderResults();
    headersForFramework(framework, '').forEach((header) => {
        const li = document.createElement('li');
        const element = document.createElement('a');

        element.href = `${URL_PREFIX}/${header.Path}`;
        element.target = '_blank';
        element.textContent = `${header.Header}`;

        element.addEventListener('click', loadHeaderFromEvent);

        li.appendChild(element);
        frameworkResultsList.appendChild(li);
    });

    // download button
    const downloadCell = document.getElementById('download-container');
    const downloadButton = document.createElement('button');
    downloadButton.className = 'download-button';
    downloadButton.style.width = '100%';

    downloadButton.innerHTML = `${framework}.framework/${framework}`;
    downloadButton.addEventListener('click', function () {
        window.open(event.target.href);
    });

    downloadCell.innerHTML = '';
    downloadCell.appendChild(downloadButton);

    currentFramework = framework;
    const prettyName = framework.includes('.dylib') ? framework : `${framework}.framework`;

    document.getElementById('framework-search').placeholder = `${prettyName} Search`;
    setViewTitle(`${prettyName}`);
}

// Pragma mark: - Event listeners
document.getElementById('version-dropdown').addEventListener('change', function (e) {
    const versionStr = e.target.value;
    currentVersion = parseFloat(versionStr);

    // lazy load indexes
    if (
        currentVersion == 15 && !fuseIndex[15].Frameworks ||
        currentVersion == 15.6 && !fuseIndex[15.6].Frameworks ||
        currentVersion == 16 && !fuseIndex[16].Frameworks ||
        currentVersion == 16.5 && !fuseIndex[16.5].Frameworks
    ) {
        lazyLoadIndexFromVersion();
    } else {
        console.log('Index already loaded for version', currentVersion);
    }

    clearSearchResults();
    const searchBar = document.getElementById('search');
    if (searchMode == 'framework') safe_frameworkSearch(searchBar.value.length > 0 ? searchBar.value : '');

    if (searchMode == 'header') safe_headerSearch(searchBar.value);
});

document.querySelectorAll('input[name="segment"]').forEach((input) => {
    input.addEventListener('change', function () {
        clearSearchResults();

        const searchBar = document.getElementById('search');

        searchMode = document.querySelector('input[name="segment"]:checked').id;
        const searchPlaceholderStr = searchMode == 'header' ? 'Header Search' : 'Framework Search';
        searchBar.placeholder = searchPlaceholderStr;

        clearSearchResults();
        if (searchMode == 'framework') safe_frameworkSearch(searchBar.value.length > 0 ? searchBar.value : '');

        if (searchMode == 'header') safe_headerSearch(searchBar.value);
    });
});

document.getElementById('search').addEventListener('input', function (e) {
    if (currentVersion == -1) return;

    const query = e.target.value;
    console.info('Searching for', query);
    if (searchMode == 'header') {
        safe_headerSearch(query);
    } else {
        safe_frameworkSearch(query);
    }
});

document.getElementById('framework-search').addEventListener('input', function () {
    searchMode = 'framework';

    const searchBar = document.getElementById('framework-search');
    const resultList = document.getElementById('framework-results-list');

    searchBar.placeholder = 'Search for a header';
    console.log('Filtering search results for frameworks');

    clearFrameworkHeaderResults();
    const headers = headersForFramework(currentFramework, searchBar.value);
    console.log(headers);
    headers.forEach((header) => {
        const li = document.createElement('li');
        const element = document.createElement('a');

        element.href = `${URL_PREFIX}/${header.Path}`;
        element.target = '_blank';
        element.textContent = `${header.Header}`;

        element.addEventListener('click', loadHeaderFromEvent);

        li.appendChild(element);
        resultList.appendChild(li);
    });
});
