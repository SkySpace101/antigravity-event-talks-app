// Constants for Badge Mapping
const TYPE_MAP = {
    'feature': { class: 'badge-feature', icon: 'fa-solid fa-star', label: 'Feature', filterType: 'feature' },
    'features': { class: 'badge-feature', icon: 'fa-solid fa-star', label: 'Feature', filterType: 'feature' },
    'new': { class: 'badge-feature', icon: 'fa-solid fa-star', label: 'Feature', filterType: 'feature' },
    'change': { class: 'badge-change', icon: 'fa-solid fa-pen-to-square', label: 'Change', filterType: 'change' },
    'changed': { class: 'badge-change', icon: 'fa-solid fa-pen-to-square', label: 'Change', filterType: 'change' },
    'deprecation': { class: 'badge-deprecation', icon: 'fa-solid fa-ban', label: 'Deprecation', filterType: 'deprecation' },
    'deprecated': { class: 'badge-deprecation', icon: 'fa-solid fa-ban', label: 'Deprecation', filterType: 'deprecation' },
    'fix': { class: 'badge-fix', icon: 'fa-solid fa-bug-slash', label: 'Fix', filterType: 'fix' },
    'fixes': { class: 'badge-fix', icon: 'fa-solid fa-bug-slash', label: 'Fix', filterType: 'fix' },
    'fixed': { class: 'badge-fix', icon: 'fa-solid fa-bug-slash', label: 'Fix', filterType: 'fix' }
};

// State Variables
let allReleases = [];
let activeCategory = 'all';
let searchQuery = '';

// DOM Elements
const themeToggle = document.getElementById('theme-toggle');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const categoryFilters = document.getElementById('category-filters');
const resultsMeta = document.getElementById('results-meta');
const resultsCount = document.getElementById('results-count');
const resetAllFiltersBtn = document.getElementById('reset-all-filters');
const loader = document.getElementById('loader');
const errorContainer = document.getElementById('error-container');
const errorMessage = document.getElementById('error-message');
const retryBtn = document.getElementById('retry-btn');
const releasesContainer = document.getElementById('releases-container');
const refreshBtn = document.getElementById('refresh-btn');
const feedStatus = document.getElementById('feed-status');

// Init application
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    fetchReleases();
    setupEventListeners();
});

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
    }
}

function toggleTheme() {
    if (document.body.classList.contains('dark-theme')) {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        localStorage.setItem('theme', 'light');
    } else {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
    }
}

// Fetch Release Notes
async function fetchReleases() {
    showLoader(true);
    showError(false);
    
    // Add spinning animation to refresh button if it was clicked
    const refreshIcon = refreshBtn.querySelector('i');
    if (refreshIcon) refreshIcon.classList.add('spinning');
    
    try {
        const response = await fetch('/api/releases');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.success) {
            // Process and cache notes locally
            allReleases = data.releases.map(release => {
                return {
                    ...release,
                    formattedDate: formatDate(release.date),
                    updates: parseContentToUpdates(release.content)
                };
            });
            
            updateFeedStatus(true);
            renderReleases();
        } else {
            throw new Error(data.message || 'Server failed to return valid data');
        }
    } catch (err) {
        console.error('Fetch error:', err);
        showError(true, err.message);
        updateFeedStatus(false);
    } finally {
        showLoader(false);
        if (refreshIcon) refreshIcon.classList.remove('spinning');
    }
}

// Update UI States
function showLoader(show) {
    loader.style.display = show ? 'flex' : 'none';
    if (show) {
        releasesContainer.innerHTML = '';
        resultsMeta.style.display = 'none';
    }
}

function showError(show, message = '') {
    errorContainer.style.display = show ? 'flex' : 'none';
    if (show && message) {
        errorMessage.textContent = message;
    }
}

function updateFeedStatus(success) {
    if (success) {
        feedStatus.innerHTML = '<span class="pulse-indicator"></span> Feed Connected';
    } else {
        feedStatus.innerHTML = '<span class="pulse-indicator stale"></span> Connection Failed';
    }
}

// Date Formatting
function formatDate(dateStr) {
    if (!dateStr) return 'Unknown Date';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr; // fallback to raw string
        
        return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    } catch (e) {
        return dateStr;
    }
}

// Parser: extracts updates grouped by <h3> headings
function parseContentToUpdates(contentHtml) {
    const div = document.createElement('div');
    div.innerHTML = contentHtml;
    
    const updates = [];
    let currentType = null;
    let currentElements = [];
    
    function saveCurrentSection() {
        if (currentElements.length > 0) {
            const tempDiv = document.createElement('div');
            // Clone nodes to append to new container
            currentElements.forEach(el => tempDiv.appendChild(el.cloneNode(true)));
            updates.push({
                type: currentType || 'note',
                html: tempDiv.innerHTML.trim()
            });
            currentElements = [];
        }
    }
    
    Array.from(div.childNodes).forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === 'h3') {
            saveCurrentSection();
            currentType = node.textContent.trim().toLowerCase();
        } else {
            currentElements.push(node);
        }
    });
    saveCurrentSection();
    
    // Fallback if no <h3> elements were found
    if (updates.length === 0 && contentHtml.trim() !== '') {
        updates.push({
            type: 'note',
            html: contentHtml.trim()
        });
    }
    
    return updates;
}

// Helper to get meta information for update type (class, icon, clean label)
function getTypeMeta(type) {
    const t = type.toLowerCase().trim();
    return TYPE_MAP[t] || { 
        class: 'badge-note', 
        icon: 'fa-solid fa-circle-info', 
        label: type.charAt(0).toUpperCase() + type.slice(1),
        filterType: 'note'
    };
}

// Highlighting text matches
function highlightText(text, query) {
    if (!query) return text;
    // Escape special regex chars
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return text.replace(regex, '<mark class="highlight">$1</mark>');
}

// Render Release Cards
function renderReleases() {
    releasesContainer.innerHTML = '';
    
    let totalItemsRendered = 0;
    
    allReleases.forEach((release, index) => {
        // 1. Filter updates by category
        let filteredUpdates = release.updates;
        if (activeCategory !== 'all') {
            filteredUpdates = release.updates.filter(up => {
                const meta = getTypeMeta(up.type);
                return meta.filterType === activeCategory;
            });
        }
        
        // 2. Filter updates by search query
        if (searchQuery) {
            filteredUpdates = filteredUpdates.filter(up => {
                const textContent = stripHtml(up.html).toLowerCase();
                const titleMatch = release.title.toLowerCase().includes(searchQuery);
                const contentMatch = textContent.includes(searchQuery);
                const typeMatch = up.type.toLowerCase().includes(searchQuery);
                return titleMatch || contentMatch || typeMatch;
            });
        }
        
        // If no updates match, hide the whole card
        if (filteredUpdates.length === 0) return;
        
        totalItemsRendered++;
        
        // 3. Construct release card
        const card = document.createElement('article');
        card.className = 'release-card card-glass';
        card.style.animationDelay = `${Math.min(index * 0.05, 0.5)}s`;
        
        // Collect types present in this card for header badges
        const uniqueTypes = [...new Set(filteredUpdates.map(up => up.type))];
        const badgesHtml = uniqueTypes.map(type => {
            const meta = getTypeMeta(type);
            return `<span class="card-badge ${meta.class}"><i class="${meta.icon}"></i> ${meta.label}</span>`;
        }).join(' ');
        
        // Construct card content
        let updatesHtml = '';
        filteredUpdates.forEach(up => {
            const meta = getTypeMeta(up.type);
            let updateContent = up.html;
            
            // Highlight query if searching
            if (searchQuery) {
                updateContent = highlightText(updateContent, searchQuery);
            }
            
            updatesHtml += `
                <div class="release-update-item">
                    <div class="release-item-header">
                        <span class="release-item-badge ${meta.class}">
                            <i class="${meta.icon}"></i> ${meta.label}
                        </span>
                        <button class="tweet-btn" data-date="${release.formattedDate}" data-type="${up.type}" title="Tweet this update">
                            <i class="fa-brands fa-x-twitter"></i> Tweet
                        </button>
                    </div>
                    <div class="release-item-content">
                        ${updateContent}
                    </div>
                </div>
            `;
        });
        
        let cardTitle = release.title;
        if (searchQuery) {
            cardTitle = highlightText(cardTitle, searchQuery);
        }
        
        card.innerHTML = `
            <div class="card-header">
                <div class="card-title-area">
                    <div class="release-date">
                        <i class="fa-regular fa-calendar"></i> ${release.formattedDate}
                    </div>
                    <h2>${cardTitle}</h2>
                </div>
                <div class="card-badges">
                    ${badgesHtml}
                </div>
            </div>
            <div class="release-card-body">
                ${updatesHtml}
            </div>
        `;
        
        releasesContainer.appendChild(card);
    });
    
    // Update Results Meta count
    updateResultsCount(totalItemsRendered);
}

// Strip HTML for plain text search
function stripHtml(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
}

// Update Search Count
function updateResultsCount(count) {
    const isFiltered = activeCategory !== 'all' || searchQuery !== '';
    if (isFiltered) {
        resultsMeta.style.display = 'flex';
        resultsCount.textContent = `Found ${count} entry/entries matching filters`;
    } else {
        resultsMeta.style.display = 'none';
    }
    
    if (count === 0) {
        releasesContainer.innerHTML = `
            <div class="no-results card-glass">
                <i class="fa-solid fa-magnifying-glass-minus"></i>
                <h3>No release notes match your criteria</h3>
                <p>Try clearing your search query or selecting a different category.</p>
            </div>
        `;
    }
}

// Tweet helper to open share window
function tweetUpdate(date, type, text) {
    const cleanType = type.charAt(0).toUpperCase() + type.slice(1);
    const hashtag = " #GCP #BigQuery";
    const prefix = `BigQuery ${cleanType} (${date}): `;
    
    // Max characters is 280.
    // Let's allocate 280 - prefix.length - hashtag.length
    const maxSnippetLength = 280 - prefix.length - hashtag.length;
    
    let snippet = text.trim();
    if (snippet.length > maxSnippetLength) {
        snippet = snippet.substring(0, maxSnippetLength - 3) + '...';
    }
    
    const tweetText = `${prefix}${snippet}${hashtag}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420,scrollbars=yes,resizable=yes');
}

// Event Listeners
function setupEventListeners() {
    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);
    
    // Tweet button handler (delegated)
    releasesContainer.addEventListener('click', (e) => {
        const tweetBtn = e.target.closest('.tweet-btn');
        if (tweetBtn) {
            const date = tweetBtn.dataset.date;
            const type = tweetBtn.dataset.type;
            const updateItem = tweetBtn.closest('.release-update-item');
            const contentEl = updateItem.querySelector('.release-item-content');
            const plainText = contentEl.innerText || contentEl.textContent || '';
            tweetUpdate(date, type, plainText);
        }
    });
    
    // Search input
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
        renderReleases();
    });
    
    // Clear search
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        searchInput.focus();
        renderReleases();
    });
    
    // Category filters
    categoryFilters.addEventListener('click', (e) => {
        const targetButton = e.target.closest('.filter-tag');
        if (!targetButton) return;
        
        // Remove active class from all
        categoryFilters.querySelectorAll('.filter-tag').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to clicked button
        targetButton.classList.add('active');
        
        activeCategory = targetButton.dataset.type;
        renderReleases();
    });
    
    // Refresh Button
    refreshBtn.addEventListener('click', fetchReleases);
    
    // Retry Button
    retryBtn.addEventListener('click', fetchReleases);
    
    // Reset all filters link
    resetAllFiltersBtn.addEventListener('click', () => {
        // Reset Search
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        
        // Reset Category buttons
        categoryFilters.querySelectorAll('.filter-tag').forEach(btn => {
            if (btn.dataset.type === 'all') {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        activeCategory = 'all';
        
        renderReleases();
    });
}
